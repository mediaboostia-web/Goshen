export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import { allowedBranchIds, canAccessBranch } from '@/lib/server/church/branch-access';
import { createNotification } from '@/lib/server/notifications';
import { log } from '@/lib/server/observability/log';

const CreateTransactionBody = z.object({
  branchId: z.string().min(1, 'Annexe requise'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().int().positive('Le montant doit être supérieur à 0 FCFA'),
  categoryId: z.string().min(1, 'Catégorie requise'),
  date: z.string().optional(),
  beneficiary: z.string().optional(),
  notes: z.string().optional(),
  // Reject non-https schemes (e.g. javascript:) — this value is rendered
  // back verbatim as an <a href>/<img src> to every member who views the
  // transaction, so a permissive z.string().url() would let a Treasurer/
  // Pastor plant a stored-XSS payload for their own org's other members.
  receiptUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'receiptUrl doit être une URL https')
    .optional(),
  receiptPublicId: z.string().optional(),
  // Optional per-transaction override of the church's default payment
  // methods (Organization.paymentMethods) — facultatif, chosen at entry time.
  paymentMethod: z.enum(['ESPECES', 'MOBILE_MONEY', 'CARTE_BANCAIRE']).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND', transactions: [] }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const type = searchParams.get('type');
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get('limit') || '30', 10)),
    );

    const allowed = allowedBranchIds(access);
    if (branchId && branchId !== 'CONSOLIDATED' && allowed && !allowed.includes(branchId)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n’avez pas accès à cette annexe.' },
        { status: 403 },
      );
    }

    const where: Record<string, unknown> = {
      organizationId: access.church.id,
    };
    if (branchId && branchId !== 'CONSOLIDATED') {
      where.branchId = branchId;
    } else if (allowed) {
      // "Consolidated" for a branch-restricted member means every branch
      // THEY can see, not the whole org's — otherwise the aggregate view
      // would leak other annexes' totals past the restriction above.
      where.branchId = { in: allowed };
    }
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type;
    }

    const [transactions, incomeAgg, expenseAgg] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          category: { select: { id: true, name: true, type: true } },
          branch: { select: { id: true, name: true } },
          author: { select: { name: true, email: true } },
        },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      transactions,
      summary: {
        totalIncome: incomeAgg._sum.amount || 0,
        totalExpense: expenseAgg._sum.amount || 0,
        netBalance: (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0),
      },
    });
  });
}

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
    // PRD F10/F13: only Treasurer and Pastor may record a transaction.
    if (!access.isTreasurer && !access.isPastor) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Seuls le trésorier et le pasteur peuvent saisir une opération.',
        },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateTransactionBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const {
      branchId,
      type,
      amount,
      categoryId,
      date,
      beneficiary,
      notes,
      receiptUrl,
      receiptPublicId,
      paymentMethod,
    } = parsed.data;

    const [targetBranch, targetCategory] = await Promise.all([
      prisma.branch.findFirst({ where: { id: branchId, organizationId: access.church.id } }),
      prisma.churchCategory.findFirst({
        where: { id: categoryId, organizationId: access.church.id },
      }),
    ]);
    if (!targetBranch) {
      return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
    }
    if (!targetCategory) {
      return NextResponse.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 404 });
    }
    if (!canAccessBranch(access, branchId)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n’avez pas accès à cette annexe.' },
        { status: 403 },
      );
    }

    const balanceDelta = type === 'INCOME' ? amount : -amount;
    const [updatedBranch, transaction] = await prisma.$transaction([
      prisma.branch.update({
        where: { id: branchId },
        data: { currentBalance: { increment: balanceDelta } },
      }),
      prisma.financialTransaction.create({
        data: {
          organizationId: access.church.id,
          branchId,
          type,
          amount,
          categoryId,
          date: date ? new Date(date) : new Date(),
          beneficiary: beneficiary || null,
          notes: notes || null,
          receiptUrl: receiptUrl || null,
          receiptPublicId: receiptPublicId || null,
          paymentMethod: paymentMethod || null,
          authorId: auth.user.sub,
        },
        include: {
          category: true,
          branch: true,
        },
      }),
    ]);

    // PRD F23 — low-balance alert: notify the Pastor + Treasurer(s) once per
    // branch per day while the balance stays under the configured threshold.
    // Best-effort: a notification failure must never fail the transaction
    // that already committed above.
    if (updatedBranch.currentBalance < updatedBranch.lowBalanceThreshold) {
      try {
        const recipients = await prisma.organizationMember.findMany({
          where: { organizationId: access.church.id, role: { in: ['PASTOR', 'TREASURER'] } },
          select: { userId: true },
        });
        const dayKey = new Date().toISOString().slice(0, 10);
        await Promise.all(
          recipients.map((r) =>
            createNotification(prisma, {
              userId: r.userId,
              type: 'low_balance',
              title: 'Solde bas',
              body: `Le solde de ${updatedBranch.name} est descendu à ${updatedBranch.currentBalance.toLocaleString('fr-FR')} FCFA, sous le seuil d’alerte de ${updatedBranch.lowBalanceThreshold.toLocaleString('fr-FR')} FCFA.`,
              data: { branchId: updatedBranch.id, balance: updatedBranch.currentBalance },
              // Must be unique per recipient, not just per branch/day — the
              // dedupeKey column has a global @unique constraint, so without
              // r.userId here the second recipient's insert collides with
              // the first's and is silently dropped as "already sent",
              // leaving only one of the Pastor/Treasurer actually notified.
              dedupeKey: `low-balance:${updatedBranch.id}:${dayKey}:${r.userId}`,
            }),
          ),
        );
      } catch (err) {
        log.warn('low-balance notification failed', {
          branchId: updatedBranch.id,
          error: String(err),
        });
      }
    }

    return NextResponse.json(
      { transaction, newBalance: updatedBranch.currentBalance },
      { status: 201 },
    );
  });
}
