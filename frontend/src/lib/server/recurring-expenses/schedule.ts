// Shared due-date math for recurring expenses, used by both the creation
// route (first-ever due date) and the validation route (next due date after
// the current one is validated). Kept in one place so adding a new
// frequency only means adding one branch here, not duplicating it.
import 'server-only';

export const RECURRING_FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

// Advances `from` by exactly one period. Used to schedule the next
// execution once the current one has just been validated — always relative
// to the execution's own due date, never to "now".
export function advanceByOnePeriod(from: Date, frequency: RecurringFrequency): Date {
  const next = new Date(from);
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      return next;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      return next;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      return next;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      return next;
  }
}

// First-ever due date for a brand-new model: the next occurrence of
// `dueDay` (and `dueMonth` for YEARLY) on or after today.
export function computeInitialDueDate(
  frequency: RecurringFrequency,
  dueDay: number,
  dueMonth?: number | null,
): Date {
  const now = new Date();

  if (frequency === 'WEEKLY') {
    const due = new Date(now);
    const currentDay = now.getDay();
    const diff = (dueDay - currentDay + 7) % 7;
    due.setDate(now.getDate() + (diff === 0 ? 7 : diff));
    return due;
  }

  // MONTHLY / QUARTERLY / YEARLY all pick a day-of-month, clamped to 28 to
  // sidestep short-month edge cases (Feb, 30-day months).
  const day = Math.min(dueDay, 28);

  if (frequency === 'YEARLY') {
    const due = new Date(now);
    due.setMonth((dueMonth ?? now.getMonth() + 1) - 1, day);
    if (due < now) due.setFullYear(due.getFullYear() + 1);
    return due;
  }

  const due = new Date(now);
  due.setDate(day);
  if (due < now) {
    due.setMonth(due.getMonth() + (frequency === 'QUARTERLY' ? 3 : 1));
  }
  return due;
}
