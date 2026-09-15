export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { mapChariowStatus } from '@/lib/server/payments/chariow';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    // Secret validation from searchParams (?secret=...)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.CHARIOW_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'UNAUTHORIZED_SECRET' }, { status: 401 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    const event = payload.event || payload.type;
    const purchase = payload.data?.purchase || payload.purchase || payload.data;
    const purchaseId = purchase?.id;
    const rawStatus = purchase?.status || payload.status;
    const customMetadata = purchase?.custom_metadata || payload.custom_metadata || {};

    const normalizedStatus = mapChariowStatus(rawStatus);

    if (normalizedStatus === 'succeeded' && purchaseId) {
      const organizationId = customMetadata.organizationId;
      const targetPlan = customMetadata.plan || 'ESSENTIAL';

      if (organizationId) {
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);

        await prisma.$transaction(async (tx) => {
          await tx.subscription.upsert({
            where: { organizationId },
            create: {
              organizationId,
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

          await tx.organization.update({
            where: { id: organizationId },
            data: {
              plan: targetPlan,
              planExpiresAt: nextMonth,
            },
          });
        });
      }
    }

    return NextResponse.json({ received: true });
  });
}
