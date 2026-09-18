import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { advanceByOnePeriod, computeInitialDueDate } from './schedule';

describe('advanceByOnePeriod', () => {
  it('adds 7 days for WEEKLY', () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    const next = advanceByOnePeriod(from, 'WEEKLY');
    expect(next.toISOString()).toBe('2026-03-17T00:00:00.000Z');
  });

  it('adds 1 month for MONTHLY', () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    const next = advanceByOnePeriod(from, 'MONTHLY');
    expect(next.getUTCMonth()).toBe(3); // April (0-indexed)
    expect(next.getUTCDate()).toBe(10);
  });

  it('adds 3 months for QUARTERLY', () => {
    const from = new Date('2026-01-15T00:00:00.000Z');
    const next = advanceByOnePeriod(from, 'QUARTERLY');
    expect(next.getUTCMonth()).toBe(3); // April
    expect(next.getUTCDate()).toBe(15);
  });

  it('adds 1 year for YEARLY, preserving month and day', () => {
    const from = new Date('2026-06-01T00:00:00.000Z');
    const next = advanceByOnePeriod(from, 'YEARLY');
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(5); // June
    expect(next.getUTCDate()).toBe(1);
  });
});

describe('computeInitialDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('WEEKLY: picks the next occurrence of dueDay strictly after today', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00')); // a Tuesday (day 2)
    const due = computeInitialDueDate('WEEKLY', 5); // Friday
    expect(due.getDay()).toBe(5);
    expect(due.getDate()).toBe(13);
  });

  it('WEEKLY: same weekday rolls to next week, not today', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00')); // Tuesday (day 2)
    const due = computeInitialDueDate('WEEKLY', 2);
    expect(due.getDate()).toBe(17);
  });

  it('MONTHLY: picks this month if the day has not passed yet', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    const due = computeInitialDueDate('MONTHLY', 28);
    expect(due.getMonth()).toBe(2); // March
    expect(due.getDate()).toBe(28);
  });

  it('MONTHLY: rolls to next month if the day already passed', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    const due = computeInitialDueDate('MONTHLY', 5);
    expect(due.getMonth()).toBe(3); // April
    expect(due.getDate()).toBe(5);
  });

  it('MONTHLY: clamps day 31 down to 28 to avoid short-month overflow', () => {
    vi.setSystemTime(new Date('2026-03-01T12:00:00'));
    const due = computeInitialDueDate('MONTHLY', 31);
    expect(due.getDate()).toBe(28);
  });

  it('QUARTERLY: rolls forward by 3 months when the day already passed', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    const due = computeInitialDueDate('QUARTERLY', 5);
    expect(due.getMonth()).toBe(5); // June
    expect(due.getDate()).toBe(5);
  });

  it('YEARLY: uses dueMonth + dueDay, this year if still upcoming', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    const due = computeInitialDueDate('YEARLY', 25, 12); // Dec 25
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(11);
    expect(due.getDate()).toBe(25);
  });

  it('YEARLY: rolls to next year if the date already passed this year', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    const due = computeInitialDueDate('YEARLY', 1, 1); // Jan 1
    expect(due.getFullYear()).toBe(2027);
    expect(due.getMonth()).toBe(0);
    expect(due.getDate()).toBe(1);
  });

  it('YEARLY: defaults dueMonth to the current month when omitted', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    const due = computeInitialDueDate('YEARLY', 5);
    expect(due.getMonth()).toBe(2); // March
  });
});
