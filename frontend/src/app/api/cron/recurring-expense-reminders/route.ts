// PRD F19 — recurring-expense due-date reminders.
//
// "Si une dépense récurrente n'est pas validée sous 24h, un rappel est
// envoyé au Trésorier. Après 48h, le Pasteur est également notifié."
//
// Runs hourly (see frontend/vercel.json). For every RecurringExpenseExecution
// still PENDING past its dueDate, notifies:
//   - Treasurer(s) once it's >= 24h overdue
//   - Treasurer(s) + Pastor(s) once it's >= 48h overdue
//
// Idempotent via createNotification's dedupeKey — each (execution, stage)
// pair fires at most once ever, so re-running this hourly never re-sends
// a reminder that already went out; it only catches executions that just
// crossed a threshold since the last tick.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createNotification } from '@/lib/server/notifications';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const log = createLogger();
const LEASE_TTL_MS = 60_000;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let remindersSent = 0;
    let escalationsSent = 0;

    await withLease(redis ?? undefined, 'recurring-expense-reminders', LEASE_TTL_MS, async () => {
      const now = new Date();
      const overdue24h = new Date(now.getTime() - 24 * HOUR_MS);

      const executions = await prisma.recurringExpenseExecution.findMany({
        where: { status: 'PENDING', dueDate: { lte: overdue24h } },
        include: {
          recurringExpense: {
            select: { id: true, name: true, amount: true, organizationId: true, branchId: true },
          },
        },
      });

      for (const execution of executions) {
        const { recurringExpense: model } = execution;
        const hoursOverdue = (now.getTime() - execution.dueDate.getTime()) / HOUR_MS;
        const roles = hoursOverdue >= 48 ? ['TREASURER', 'PASTOR'] : ['TREASURER'];
        const stage = hoursOverdue >= 48 ? '48h' : '24h';

        const recipients = await prisma.organizationMember.findMany({
          where: { organizationId: model.organizationId, role: { in: roles } },
          select: { userId: true },
        });

        for (const recipient of recipients) {
          const created = await createNotification(prisma, {
            userId: recipient.userId,
            type: 'recurring_expense_due',
            title:
              stage === '48h'
                ? `Échéance non validée depuis 48h : ${model.name}`
                : `Dépense récurrente à valider : ${model.name}`,
            body: `${model.name} — ${model.amount.toLocaleString('fr-FR')} FCFA — en attente de validation depuis ${Math.floor(hoursOverdue)}h.`,
            data: {
              executionId: execution.id,
              recurringExpenseId: model.id,
              branchId: model.branchId,
            },
            // Must be unique per recipient — the dedupeKey column has a
            // global @unique constraint, so without recipient.userId here
            // the second recipient's insert (e.g. the Pastor at the 48h
            // stage, once the Treasurer's row already exists) collides with
            // the first's and is silently dropped as "already sent",
            // leaving only one of the two actually notified.
            dedupeKey: `recurring-reminder:${execution.id}:${stage}:${recipient.userId}`,
          });
          if (created) {
            if (stage === '48h') escalationsSent++;
            else remindersSent++;
          }
        }
      }

      log.info('recurring-expense-reminders tick', {
        checked: executions.length,
        remindersSent,
        escalationsSent,
        requestId: ctx.requestId,
      });
    });

    return NextResponse.json(
      { ok: true, remindersSent, escalationsSent },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
