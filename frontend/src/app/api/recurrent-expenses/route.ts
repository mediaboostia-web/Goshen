export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';
import { allowedBranchIds, canAccessBranch } from '@/lib/server/church/branch-access';
import {
  RECURRING_FREQUENCIES,
  computeInitialDueDate,
} from '@/lib/server/recurring-expenses/schedule';
import { createNotification } from '@/lib/server/notifications';
import { isChannelEnabled, readPrefs } from '@/lib/server/notifications/prefs-merge';
import { getCurrencyLabel } from '@/lib/utils';
import { log } from '@/lib/server/observability/log';

const CreateRecurrentExpenseBody = z.object({
  branchId: z.string().min(1, 'Annexe requise'),
  name: z.string().min(3, 'Nom du modèle requis (ex: Cotisation caisse nationale)'),
  amount: z.number().int().positive('Montant requis'),
  frequency: z.enum(RECURRING_FREQUENCIES),
  dueDay: z.number().int().min(0).max(31),
  dueMonth: z.number().int().min(1).max(12).optional(),
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
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

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
      where.branchId = { in: allowed };
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
            ...(branchId && branchId !== 'CONSOLIDATED'
              ? { branchId }
              : allowed
                ? { branchId: { in: allowed } }
                : {}),
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
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

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

    const { branchId, name, amount, frequency, dueDay, dueMonth, categoryId } = parsed.data;

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
    if (!canAccessBranch(access, branchId)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n’avez pas accès à cette annexe.' },
        { status: 403 },
      );
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
            dueMonth: frequency === 'YEARLY' ? (dueMonth ?? new Date().getMonth() + 1) : null,
            categoryId,
            status: 'ACTIVE',
          },
        });

        const dueDate = computeInitialDueDate(frequency, dueDay, rec.dueMonth);

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

    const churchCurrency = getCurrencyLabel(access.church.currency);
    try {
      const recipients = await prisma.organizationMember.findMany({
        where: { organizationId: access.church.id, role: { in: ['PASTOR', 'TREASURER'] } },
        select: { userId: true },
      });
      const prefRows = await prisma.notificationPreferences.findMany({
        where: { userId: { in: recipients.map((r) => r.userId) } },
        select: { userId: true, prefs: true },
      });
      const prefsByUser = new Map(prefRows.map((p) => [p.userId, readPrefs(p.prefs)]));
      const optedIn = recipients.filter((r) =>
        isChannelEnabled(prefsByUser.get(r.userId), 'recurrent_expense_pending', 'inApp'),
      );
      await Promise.all(
        optedIn.map((r) =>
          createNotification(prisma, {
            userId: r.userId,
            type: 'recurrent_expense_pending',
            title: 'Charge fixe à valider',
            body: `Une charge fixe pour « ${model.name} » (${model.amount.toLocaleString('fr-FR')} ${churchCurrency}) est planifiée et requiert votre validation pour décaissement.`,
            data: {
              recurringExpenseId: model.id,
              branchId: model.branchId,
              amount: model.amount,
            },
            dedupeKey: `rec-expense-created:${model.id}:${r.userId}`,
          }),
        ),
      );
    } catch (err) {
      log.warn('recurrent-expense creation notification failed', {
        recurringExpenseId: model.id,
        error: String(err),
      });
    }

    return NextResponse.json({ model }, { status: 201 });
  });
}
