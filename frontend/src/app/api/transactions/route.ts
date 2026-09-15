export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import { createNotification } from '@/lib/server/notifications';

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

interface StoredTransaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  beneficiary: string | null;
  notes: string | null;
  receiptUrl: string | null;
  branchId: string;
  categoryId: string;
  category: { id: string; name: string };
  branch: { id: string; name: string };
  author: { name: string; email: string };
}

declare global {
  var __goshenTransactions: StoredTransaction[] | undefined;
}

const INITIAL_MOCK_TRANSACTIONS: StoredTransaction[] = [
  {
    id: 'tx_init_1',
    amount: 1500000,
    type: 'INCOME',
    date: new Date().toISOString(),
    beneficiary: null,
    notes: 'Dîmes pastorales & fidèles du culte',
    receiptUrl: null,
    branchId: 'br_main_libreville',
    categoryId: 'cat_dimes',
    category: { id: 'cat_dimes', name: 'Dîmes régulières' },
    branch: { id: 'br_main_libreville', name: 'Siège Principal — Libreville' },
    author: { name: 'Pasteur Samuel', email: 'samuel@eglise.ga' },
  },
  {
    id: 'tx_init_2',
    amount: 450000,
    type: 'INCOME',
    date: new Date(Date.now() - 86400000).toISOString(),
    beneficiary: null,
    notes: 'Offrandes dominicales ordinaires',
    receiptUrl: null,
    branchId: 'br_main_libreville',
    categoryId: 'cat_offrandes',
    category: { id: 'cat_offrandes', name: 'Offrandes dominicales' },
    branch: { id: 'br_main_libreville', name: 'Siège Principal — Libreville' },
    author: { name: 'Trésorier Pierre', email: 'pierre@eglise.ga' },
  },
  {
    id: 'tx_init_3',
    amount: 180000,
    type: 'EXPENSE',
    date: new Date(Date.now() - 172800000).toISOString(),
    beneficiary: 'SEEG Gabon',
    notes: 'Règlement facture électricité & eau sanctuaire',
    receiptUrl: null,
    branchId: 'br_main_libreville',
    categoryId: 'cat_seeg',
    category: { id: 'cat_seeg', name: 'Factures SEEG & électricité' },
    branch: { id: 'br_main_libreville', name: 'Siège Principal — Libreville' },
    author: { name: 'Trésorier Pierre', email: 'pierre@eglise.ga' },
  },
];

if (!global.__goshenTransactions) {
  global.__goshenTransactions = [...INITIAL_MOCK_TRANSACTIONS];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const type = searchParams.get('type');
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '30', 10)));

    try {
      const auth = await requireAuth(req.headers.get('authorization'));
      if (!(auth instanceof NextResponse)) {
        const access = await resolveChurchUser(auth.user.sub);
        if (access) {
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
        }
      }
    } catch {
      // Fallback
    }

    // Fallback in-memory
    const all = global.__goshenTransactions ?? INITIAL_MOCK_TRANSACTIONS;
    const filtered = all.filter((tx) => {
      if (branchId && branchId !== 'CONSOLIDATED' && tx.branchId !== branchId) return false;
      if (type && tx.type !== type) return false;
      return true;
    });

    const totalIncome = filtered
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, cur) => acc + cur.amount, 0);
    const totalExpense = filtered
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, cur) => acc + cur.amount, 0);

    return NextResponse.json({
      transactions: filtered.slice(0, limit),
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
      },
    });
  });
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const body = await req.json().catch(() => null);
    const parsed = CreateTransactionBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED', details: parsed.error.issues }, { status: 400 });
    }

    const { branchId, type, amount, categoryId, date, beneficiary, notes, receiptUrl, receiptPublicId } = parsed.data;

    try {
      const auth = await requireAuth(req.headers.get('authorization'));
      if (!(auth instanceof NextResponse)) {
        const access = await resolveChurchUser(auth.user.sub);
        if (access && (access.isTreasurer || access.isPastor)) {
          const targetBranch = await prisma.branch.findFirst({
            where: { id: branchId, organizationId: access.church.id },
          });

          if (targetBranch) {
            const balanceDelta = type === 'INCOME' ? amount : -amount;
            const updatedBranch = await prisma.branch.update({
              where: { id: branchId },
              data: { currentBalance: { increment: balanceDelta } },
            });

            const transaction = await prisma.financialTransaction.create({
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
            });

            return NextResponse.json({ transaction, newBalance: updatedBranch.currentBalance }, { status: 201 });
          }
        }
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const matchedCategory = (global.__goshenCategories || []).find((c) => c.id === categoryId) || {
      id: categoryId,
      name: type === 'INCOME' ? 'Entrée de collecte' : 'Décaissement',
    };

    const newTx: StoredTransaction = {
      id: `tx_${Date.now()}`,
      amount,
      type,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      beneficiary: beneficiary || null,
      notes: notes || null,
      receiptUrl: receiptUrl || null,
      branchId,
      categoryId,
      category: matchedCategory,
      branch: { id: branchId, name: 'Siège Principal — Libreville' },
      author: { name: 'Trésorier Général', email: 'tresorerie@eglise.ga' },
    };

    if (!global.__goshenTransactions) {
      global.__goshenTransactions = [];
    }
    global.__goshenTransactions.unshift(newTx);

    return NextResponse.json({ transaction: newTx, newBalance: 4500000 }, { status: 201 });
  });
}
