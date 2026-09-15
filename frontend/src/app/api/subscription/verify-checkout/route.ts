export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import { chariow, ChariowNotConfiguredError } from '@/lib/server/payments/chariow';

const VerifyBody = z.object({
  purchaseId: z.string().min(1, 'ID d’achat Chariow requis'),
  plan: z.enum(['ESSENTIAL', 'PREMIUM']).optional(),
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

    const body = await req.json().catch(() => null);
    const parsed = VerifyBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { purchaseId, plan: fallbackPlan } = parsed.data;

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
      return NextResponse.json(
        {
          error: 'VERIFY_FAILED',
          message: err instanceof Error ? err.message : 'Échec de la vérification du paiement',
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

    // Payment succeeded! Update church plan for 30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const targetPlan = fallbackPlan || 'ESSENTIAL';

    await prisma.$transaction(async (tx) => {
      // 1. Update Subscription
      await tx.subscription.upsert({
        where: { organizationId: access.church.id },
        create: {
          organizationId: access.church.id,
          plan: targetPlan,
          status: 'ACTIVE',
          provider: 'CHARIOW',
          chariowPurchaseId: purchaseId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextMonth,
        },
        update: {
          plan: targetPlan,
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
    });

    return NextResponse.json({
      verified: true,
      status: 'succeeded',
      plan: targetPlan,
      expiresAt: nextMonth.toISOString(),
    });
  });
}
