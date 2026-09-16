export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';

const CreateRecurrentExpenseBody = z.object({
  branchId: z.string().min(1, 'Annexe requise'),
  name: z.string().min(3, 'Nom du modèle requis (ex: Cotisation caisse nationale)'),
  amount: z.number().int().positive('Montant requis'),
  frequency: z.enum(['WEEKLY', 'MONTHLY']),
  dueDay: z.number().int().min(0).max(31),
  categoryId: z.string().min(1, 'Catégorie requise'),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const where: Record<string, unknown> = {
      organizationId: access.church.id,
    };
    if (branchId && branchId !== 'CONSOLIDATED') {
      where.branchId = branchId;
    }

    const [models, pendingExecutions] = await Promise.all([
      prisma.recurringExpense.findMany({
        where,
        include: {
          category: true,
          branch: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.recurringExpenseExecution.findMany({
        where: {
          status: 'PENDING',
          recurringExpense: {
            organizationId: access.church.id,
            ...(branchId && branchId !== 'CONSOLIDATED' ? { branchId } : {}),
          },
        },
        include: {
          recurringExpense: {
            include: {
              category: true,
              branch: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return NextResponse.json({ models, pendingExecutions });
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

    if (!access.isTreasurer && !access.isPastor) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Seul le pasteur ou trésorier peut créer un modèle.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateRecurrentExpenseBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { branchId, name, amount, frequency, dueDay, categoryId } = parsed.data;

    // branchId/categoryId come from the client — must be verified to belong
    // to the caller's own organization before use. Without this, a pastor
    // of Church A could target Church B's branchId; on later validation
    // (validate/route.ts) that branch's real cash balance gets decremented
    // for a church that never authorized the expense.
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

    // Create the recurring model and its first pending execution
    const model = await prisma.$transaction(
      async (tx) => {
        const rec = await tx.recurringExpense.create({
          data: {
            organizationId: access.church.id,
            branchId,
            name,
            amount,
            frequency,
            dueDay,
            categoryId,
            status: 'ACTIVE',
          },
        });

        // Calculate initial due date
        const now = new Date();
        const dueDate = new Date();
        if (frequency === 'MONTHLY') {
          dueDate.setDate(Math.min(dueDay, 28));
          if (dueDate < now) {
            dueDate.setMonth(dueDate.getMonth() + 1);
          }
        } else {
          // Weekly (dueDay 0=Sunday)
          const currentDay = now.getDay();
          const diff = (dueDay - currentDay + 7) % 7;
          dueDate.setDate(now.getDate() + (diff === 0 ? 7 : diff));
        }

        await tx.recurringExpenseExecution.create({
          data: {
            recurringExpenseId: rec.id,
            dueDate,
            amount,
            status: 'PENDING',
          },
        });

        return rec;
      },
      { timeout: 15000 },
    );

    return NextResponse.json({ model }, { status: 201 });
  });
}
