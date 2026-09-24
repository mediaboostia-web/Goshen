// GET /api/admin/organizations/[id] — detail: org fields, owner, branches,
// members, and a 30-day transaction summary.
// DELETE /api/admin/organizations/[id] — permanently deletes the church and
// everything scoped to it (branches, members, transactions, categories,
// recurring expenses, reports, invoices — all onDelete: Cascade in schema).
// Donation rows survive with organizationId set to null (platform-level
// financial history, per schema comment). Irreversible, so gated
// SUPERADMIN-only (unlike suspend, which is ADMIN-level) and requires the
// caller to echo the exact organization name back as confirmation.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
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

const DeleteBody = z.object({
  // The caller must echo the organization's exact current name back — same
  // "type to confirm" discipline as GitHub repo deletion — so a superadmin
  // can't nuke a church by a stray double-click on a shared endpoint.
  confirmName: z.string().min(1),
  reason: z.string().min(1).max(500).optional(),
});

type DeleteResult = { kind: 'NOT_FOUND' } | { kind: 'MISMATCH' } | { kind: 'DELETED' };

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('SUPERADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }

    const result: DeleteResult = await prisma.$transaction(
      async (tx) => {
        const target = await tx.organization.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                branches: true,
                members: true,
                transactions: true,
                recurringExpenses: true,
                reports: true,
                generatedInvoices: true,
                categories: true,
                donations: true,
              },
            },
          },
        });
        if (!target) return { kind: 'NOT_FOUND' as const };
        if (target.name !== parsed.data.confirmName) return { kind: 'MISMATCH' as const };

        // Logged before the delete (same tx) since AdminAction.targetId is a
        // plain string with no FK to Organization — the audit row is meant
        // to outlive the church it describes.
        await logAdminAction(tx, {
          actorId: auth.admin.id,
          action: 'organization.delete',
          targetType: 'Organization',
          targetId: id,
          metadata: {
            name: target.name,
            counts: target._count,
            ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
          },
        });

        await tx.organization.delete({ where: { id } });

        return { kind: 'DELETED' as const };
      },
      { timeout: 20000 },
    );

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'ORGANIZATION_NOT_FOUND' }, { status: 404 });
    }
    if (result.kind === 'MISMATCH') {
      return NextResponse.json(
        {
          error: 'CONFIRMATION_MISMATCH',
          message: 'Le nom saisi ne correspond pas au nom de l’église.',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ deleted: true }, { status: 200 });
  });
}
