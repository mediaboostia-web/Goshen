export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';

const ValidateBody = z.object({
  executionId: z.string().min(1, 'ID d’échéance requis'),
  action: z.enum(['VALIDATE', 'POSTPONE']),
  reason: z.string().optional(),
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

    if (!access.isTreasurer && !access.isPastor) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Seul le trésorier ou pasteur peut valider une échéance.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = ValidateBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { executionId, action, reason } = parsed.data;

    const execution = await prisma.recurringExpenseExecution.findUnique({
      where: { id: executionId },
      include: {
        recurringExpense: {
          include: {
            branch: true,
            category: true,
          },
        },
      },
    });

    if (!execution || execution.recurringExpense.organizationId !== access.church.id) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Échéance introuvable.' },
        { status: 404 },
      );
    }

    if (execution.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'ALREADY_PROCESSED', message: 'Cette échéance a déjà été traitée.' },
        { status: 400 },
      );
    }

    if (action === 'POSTPONE') {
      const updated = await prisma.recurringExpenseExecution.update({
        where: { id: executionId },
        data: {
          status: 'POSTPONED',
          postponedReason: reason || 'Reporté par le responsable',
        },
      });
      return NextResponse.json({ success: true, execution: updated });
    }

    // Action === 'VALIDATE': 1-click execution
    const res = await prisma.$transaction(async (tx) => {
      const { recurringExpense } = execution;

      // 1. Deduct from branch balance
      const updatedBranch = await tx.branch.update({
        where: { id: recurringExpense.branchId },
        data: {
          currentBalance: { decrement: execution.amount },
        },
      });

      // 2. Create financial transaction
      const transaction = await tx.financialTransaction.create({
        data: {
          organizationId: access.church.id,
          branchId: recurringExpense.branchId,
          type: 'EXPENSE',
          amount: execution.amount,
          categoryId: recurringExpense.categoryId,
          beneficiary: recurringExpense.name,
          notes: `Dépense récurrente validée : ${recurringExpense.name}`,
          authorId: auth.user.sub,
          recurringExpenseExecutionId: execution.id,
        },
      });

      // 3. Mark execution as VALIDATED
      const updatedExecution = await tx.recurringExpenseExecution.update({
        where: { id: executionId },
        data: {
          status: 'VALIDATED',
          validatedAt: new Date(),
          validatedById: auth.user.sub,
          transactionId: transaction.id,
        },
      });

      // 4. Schedule next recurring execution
      const nextDue = new Date(execution.dueDate);
      if (recurringExpense.frequency === 'MONTHLY') {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else {
        nextDue.setDate(nextDue.getDate() + 7);
      }

      await tx.recurringExpenseExecution.create({
        data: {
          recurringExpenseId: recurringExpense.id,
          dueDate: nextDue,
          amount: recurringExpense.amount,
          status: 'PENDING',
        },
      });

      return {
        transaction,
        execution: updatedExecution,
        newBalance: updatedBranch.currentBalance,
      };
    });

    return NextResponse.json({ success: true, ...res });
  });
}
