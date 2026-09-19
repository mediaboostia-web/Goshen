// GET /api/admin/organizations/[id] — detail: org fields, owner, branches,
// members, and a 30-day transaction summary.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;

    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        denomination: true,
        currency: true,
        status: true,
        createdAt: true,
        owner: { select: { id: true, email: true, name: true } },
        branches: {
          select: { id: true, name: true, city: true, isMain: true, status: true },
          orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
        },
        members: {
          select: {
            id: true,
            role: true,
            user: { select: { id: true, email: true, name: true, status: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'ORGANIZATION_NOT_FOUND' }, { status: 404 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [txCount, txSum] = await Promise.all([
      prisma.financialTransaction.count({
        where: { organizationId: id, createdAt: { gte: since } },
      }),
      prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { organizationId: id, createdAt: { gte: since } },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json(
      {
        organization: org,
        last30Days: {
          transactionCount: txCount,
          byType: txSum.map((row) => ({ type: row.type, total: row._sum.amount ?? 0 })),
        },
      },
      { headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
