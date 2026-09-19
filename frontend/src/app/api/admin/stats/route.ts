// GET /api/admin/stats — platform overview counters for the admin dashboard
// homepage. Cheap parallel aggregates, no time-series engine.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      organizationCount,
      suspendedOrganizationCount,
      userCount,
      activeUserCount,
      memberCount,
      branchCount,
      transactionCount,
      transactionsByType,
      activeRecurringExpenseCount,
      reportCount,
      donationTotals,
      donationsThisMonth,
      recentUsers,
      recentDonations,
      recentOrganizations,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.organizationMember.count(),
      prisma.branch.count({ where: { status: 'ACTIVE' } }),
      prisma.financialTransaction.count(),
      prisma.financialTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
      prisma.recurringExpense.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count(),
      prisma.donation.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.donation.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      prisma.donation.findMany({
        take: 10,
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { id: true, amount: true, donorName: true, donorEmail: true, completedAt: true },
      }),
      prisma.organization.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, status: true, createdAt: true },
      }),
    ]);

    const totalIncome = transactionsByType.find((t) => t.type === 'INCOME')?._sum.amount ?? 0;
    const totalExpense = transactionsByType.find((t) => t.type === 'EXPENSE')?._sum.amount ?? 0;

    return NextResponse.json(
      {
        organizations: {
          total: organizationCount,
          active: organizationCount - suspendedOrganizationCount,
          suspended: suspendedOrganizationCount,
          activeBranches: branchCount,
        },
        users: { total: userCount, active: activeUserCount, memberships: memberCount },
        transactions: {
          total: transactionCount,
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense,
        },
        recurringExpenses: { active: activeRecurringExpenseCount },
        reports: { total: reportCount },
        donations: {
          totalCollected: donationTotals._sum.amount ?? 0,
          completedCount: donationTotals._count,
          thisMonth: {
            amount: donationsThisMonth._sum.amount ?? 0,
            count: donationsThisMonth._count,
          },
        },
        recentUsers,
        recentDonations,
        recentOrganizations,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
