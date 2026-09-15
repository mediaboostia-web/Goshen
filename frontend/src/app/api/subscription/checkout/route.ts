export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import { chariow } from '@/lib/server/payments/chariow';

const CheckoutBody = z.object({
  plan: z.enum(['ESSENTIAL', 'PREMIUM']),
  phone: z.string().optional(),
  phoneCountry: z.string().optional().default('GA'),
  phoneLocal: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }

    if (!access.isPastor) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Seul le pasteur peut souscrire un abonnement.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = CheckoutBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED', details: parsed.error.issues }, { status: 400 });
    }

    const { plan, phone, phoneCountry, phoneLocal, firstName, lastName } = parsed.data;

    // Chariow product ID per plan
    const productId =
      plan === 'PREMIUM'
        ? process.env.CHARIOW_PRODUCT_ID_PREMIUM || 'prod_goshen_premium_15k'
        : process.env.CHARIOW_PRODUCT_ID_ESSENTIAL || 'prod_goshen_essential_3k5';

    const origin = process.env.APP_URL || 'http://localhost:3000';
    const redirectUrl = `${origin}/checkout/success?provider=chariow&plan=${plan}&slug=${access.church.slug}`;

    try {
      const checkoutRes = await chariow.createCheckout({
        productId,
        email: auth.user.email,
        firstName: firstName || 'Pasteur',
        lastName: lastName || access.church.name,
        phone: { phone, phoneCountry, phoneLocal },
        redirectUrl,
        customMetadata: {
          organizationId: access.church.id,
          plan,
          userId: auth.user.sub,
        },
      });

      // Upsert pending subscription
      await prisma.subscription.upsert({
        where: { organizationId: access.church.id },
        create: {
          organizationId: access.church.id,
          plan,
          status: 'PAST_DUE', // until verified
          provider: 'CHARIOW',
          chariowPurchaseId: checkoutRes.purchaseId,
          chariowProductId: productId,
          customerPhone: phoneLocal || phone || null,
        },
        update: {
          plan,
          provider: 'CHARIOW',
          chariowPurchaseId: checkoutRes.purchaseId,
          chariowProductId: productId,
          customerPhone: phoneLocal || phone || null,
        },
      });

      return NextResponse.json({ checkoutUrl: checkoutRes.checkoutUrl, purchaseId: checkoutRes.purchaseId });
    } catch (err) {
      return NextResponse.json(
        { error: 'CHECKOUT_FAILED', message: err instanceof Error ? err.message : 'Échec de création du checkout' },
        { status: 500 }
      );
    }
  });
}
