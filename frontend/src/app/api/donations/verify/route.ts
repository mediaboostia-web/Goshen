// POST /api/donations/verify — poll-based confirmation for a donation cart,
// called from /soutenir/merci after the donor returns from Maketou's hosted
// checkout. Same CSRF/auth posture as /api/donations/checkout (anonymous
// donors must be able to verify their own payment without a session).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  maketou,
  MaketouNotConfiguredError,
  MaketouRateLimitedError,
} from '@/lib/server/payments/maketou';
import { log } from '@/lib/server/observability/log';

const VerifyBody = z.object({
  donationId: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const body = await req.json().catch(() => null);
    const parsed = VerifyBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const donation = await prisma.donation.findUnique({
      where: { id: parsed.data.donationId },
    });
    if (!donation) {
      return NextResponse.json({ error: 'DONATION_NOT_FOUND' }, { status: 404 });
    }

    // Replay guard: already confirmed — never re-hit Maketou's rate-limited
    // GET endpoint for a cart we already know completed.
    if (donation.status === 'COMPLETED') {
      return NextResponse.json({ verified: true, alreadyProcessed: true });
    }

    let cart;
    try {
      cart = await maketou.getCart(donation.maketouCartId);
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
      if (err instanceof MaketouRateLimitedError) {
        return NextResponse.json(
          { verified: false, status: 'pending', retryAfterMs: err.retryAfterMs },
          { status: 200 },
        );
      }
      log.warn('donation verify failed', {
        donationId: parsed.data.donationId,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: 'VERIFY_FAILED', message: 'Échec de la vérification du don.' },
        { status: 502 },
      );
    }

    if (cart.status === 'succeeded') {
      await prisma.donation.update({
        where: { id: donation.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return NextResponse.json({ verified: true });
    }

    if (cart.status === 'abandoned' || cart.status === 'failed') {
      await prisma.donation.update({
        where: { id: donation.id },
        data: { status: cart.status === 'abandoned' ? 'ABANDONED' : 'FAILED' },
      });
      return NextResponse.json({ verified: false, status: cart.status });
    }

    return NextResponse.json({ verified: false, status: 'pending' });
  });
}
