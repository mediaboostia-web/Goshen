export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import { chariow, ChariowNotConfiguredError } from '@/lib/server/payments/chariow';
import { log } from '@/lib/server/observability/log';

const VerifyBody = z.object({
  purchaseId: z.string().min(1, 'ID d’achat Chariow requis'),
  plan: z.enum(['ESSENTIAL', 'PREMIUM']).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = VerifyBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { purchaseId } = parsed.data;

    // The purchaseId must be the one this org's own checkout created
    // (Subscription.chariowPurchaseId, written by POST /api/subscription/checkout).
    // Without this check, any authenticated user could pass ANY other
    // church's valid purchaseId and activate/extend their own subscription
    // with it — or self-select a plan that was never actually paid for.
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: access.church.id },
    });
    if (!subscription || subscription.chariowPurchaseId !== purchaseId) {
      return NextResponse.json(
        {
          error: 'PURCHASE_NOT_FOUND',
          message: 'Cet achat ne correspond à aucune souscription initiée par votre église.',
        },
        { status: 404 },
      );
    }

    // Replay guard: this purchaseId was already verified and applied —
    // don't let a repeated call push currentPeriodEnd another 30 days out.
    if (
      subscription.status === 'ACTIVE' &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd.getTime() > Date.now()
    ) {
      return NextResponse.json({
        verified: true,
        status: 'succeeded',
        plan: subscription.plan,
        expiresAt: subscription.currentPeriodEnd.toISOString(),
        alreadyProcessed: true,
      });
    }

    let sale;
    try {
      sale = await chariow.getSale(purchaseId);
    } catch (err) {
      if (err instanceof ChariowNotConfiguredError) {
        return NextResponse.json(
          {
            error: 'PAYMENT_PROVIDER_UNCONFIGURED',
            message: 'Le paiement en ligne n’est pas encore configuré.',
          },
          { status: 503 },
        );
      }
      log.warn('subscription verify-checkout failed', {
        organizationId: access.church.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          error: 'VERIFY_FAILED',
          message: 'Échec de la vérification du paiement.',
        },
        { status: 502 },
      );
    }

    if (sale.status !== 'succeeded') {
      return NextResponse.json({
        status: sale.status,
        rawStatus: sale.rawStatus,
        verified: false,
        message: 'Le paiement est toujours en attente de confirmation par l’opérateur.',
      });
    }

    // Payment succeeded! Update church plan for 30 days. The plan is the one
    // recorded at checkout time (server-trusted) — never the client-supplied
    // body field, which would let a caller self-upgrade to a plan they never
    // paid for.
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const targetPlan = subscription.plan;

    await prisma.$transaction(
      async (tx) => {
        // 1. Update Subscription
        await tx.subscription.update({
          where: { organizationId: access.church.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextMonth,
          },
        });

        // 2. Update Organization
        await tx.organization.update({
          where: { id: access.church.id },
          data: {
            plan: targetPlan,
            planExpiresAt: nextMonth,
          },
        });
      },
      { timeout: 15000 },
    );

    return NextResponse.json({
      verified: true,
      status: 'succeeded',
      plan: targetPlan,
      expiresAt: nextMonth.toISOString(),
    });
  });
}
