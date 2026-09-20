// POST /api/donations/checkout — free-amount donation to support the
// platform (not tied to any church subscription — the app is free).
//
// CSRF carve-out: donations are open to anonymous visitors (confirmed
// product decision — a donor need not be logged in), so no CSRF cookie is
// guaranteed to exist. Same carve-out as /api/auth/signup — calling
// verifyCsrf here would 403 every legitimate anonymous donation. Rate
// limited by donor email (falls back to IP) instead of CSRF.
export const runtime = 'nodejs';

import 'server-only';
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { zEmail } from '@/lib/server/zod-helpers';
import { optionalAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import {
  maketou,
  MaketouNotConfiguredError,
  MaketouRequestError,
} from '@/lib/server/payments/maketou';
import { log } from '@/lib/server/observability/log';

const CheckoutBody = z.object({
  amount: z.number().int().positive(),
  donorEmail: zEmail,
  donorName: z.string().optional(),
  phone: z.string().optional(),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'donations:checkout',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.DONATIONS_RATE_LIMIT_MAX ?? 10),
  code: 'TOO_MANY_DONATION_ATTEMPTS',
  message: 'Trop de tentatives. Réessayez plus tard.',
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const body = await req.json().catch(() => null);
    const parsed = CheckoutBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const limited = await limiter.check(req, parsed.data.donorEmail);
    if (limited) return limited;

    const productId = process.env.MAKETOU_PRODUCT_ID;
    if (!productId) {
      return NextResponse.json(
        {
          error: 'DONATION_PROVIDER_UNCONFIGURED',
          message: 'Le don en ligne n’est pas encore configuré.',
        },
        { status: 503 },
      );
    }

    const { amount, donorEmail, donorName, phone } = parsed.data;

    // Best-effort: attach the donor's own church if they happen to be
    // logged in, purely for admin-side context — never required.
    let organizationId: string | undefined;
    const auth = await optionalAuth(req.headers.get('authorization'));
    if (auth) {
      const access = await resolveChurchUser(auth.user.sub);
      if (access) organizationId = access.church.id;
    }

    const rawOrigin =
      req.headers.get('origin') ||
      process.env.APP_URL ||
      'http://127.0.0.1:3000';
    // Maketou strictly validates redirectURL (rejects 'localhost' without TLD, accepts '127.0.0.1' and public domains)
    const origin = rawOrigin.replace('://localhost', '://127.0.0.1').replace(/\/+$/, '');
    const nameParts = (donorName || 'Généreux').split(' ');
    const firstName = nameParts[0] || 'Généreux';
    const lastName = nameParts.slice(1).join(' ') || 'Donateur';

    // Maketou's `redirectURL` must be built BEFORE createCart() returns a
    // cart id (chicken-and-egg — the id doesn't exist yet when the request
    // is sent), so it can't carry Maketou's cart id. Pre-generate our own
    // Donation.id instead and use THAT as the correlation token in the
    // return URL — same fix as the earlier Chariow purchaseId round-trip.
    const donationId = randomUUID();

    try {
      const { cart, redirectUrl } = await maketou.createCart({
        productDocumentId: productId,
        email: donorEmail,
        firstName,
        lastName,
        ...(phone ? { phone } : {}),
        redirectUrl: `${origin}/soutenir/merci?donationId=${donationId}`,
        customerPrice: amount,
        meta: { source: 'goshen-finance', ...(organizationId ? { organizationId } : {}) },
      });

      await prisma.donation.create({
        data: {
          id: donationId,
          maketouCartId: cart.id,
          status: 'PENDING',
          amount,
          donorEmail,
          donorName: donorName || null,
          organizationId: organizationId || null,
        },
      });

      return NextResponse.json({ redirectUrl, donationId });
    } catch (err) {
      if (err instanceof MaketouNotConfiguredError) {
        return NextResponse.json(
          {
            error: 'DONATION_PROVIDER_UNCONFIGURED',
            message: 'Le don en ligne n’est pas encore configuré.',
          },
          { status: 503 },
        );
      }
      if (err instanceof MaketouRequestError && err.code === 'CUSTOMER_PRICE_BELOW_MINIMUM') {
        return NextResponse.json(
          {
            error: 'CUSTOMER_PRICE_BELOW_MINIMUM',
            message: 'Le montant minimum n’est pas atteint.',
          },
          { status: 422 },
        );
      }
      if (err instanceof MaketouRequestError) {
        log.warn('donation checkout failed (Maketou API error)', {
          status: err.status,
          code: err.code,
          error: err.message,
        });
        return NextResponse.json(
          {
            error: err.code || 'CHECKOUT_FAILED',
            message: err.message || 'Échec de création du don.',
          },
          { status: err.status >= 400 && err.status < 500 ? err.status : 502 },
        );
      }
      log.warn('donation checkout failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: 'CHECKOUT_FAILED', message: 'Échec de création du don.' },
        { status: 502 },
      );
    }
  });
}
