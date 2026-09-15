export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
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
  receiptUrl: z.string().url().optional(),
  receiptPublicId: z.string().optional(),
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

    const where: Record<string, unknown> = {
      organizationId: access.church.id,
    };
    if (branchId && branchId !== 'CONSOLIDATED') {
      where.branchId = branchId;
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
    } = parsed.data;

    const targetBranch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: access.church.id },
    });
    if (!targetBranch) {
      return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
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
              dedupeKey: `low-balance:${updatedBranch.id}:${dayKey}`,
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
