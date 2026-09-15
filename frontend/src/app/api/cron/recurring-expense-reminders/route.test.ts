import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/cron/auth', () => ({ verifyCronSecret: vi.fn(() => null) }));
vi.mock('@/lib/server/leader-lease', () => ({
  withLease: vi.fn(async (_r: unknown, _n: string, _t: number, fn: () => Promise<void>) => fn()),
}));
vi.mock('@/lib/server/redis', () => ({ redis: null }));

const findManyExecutions = vi.fn();
const findManyMembers = vi.fn();
const notificationCreate = vi.fn();

vi.mock('@/lib/server/prisma', () => ({
  prisma: {
    recurringExpenseExecution: { findMany: (...a: unknown[]) => findManyExecutions(...a) },
    organizationMember: { findMany: (...a: unknown[]) => findManyMembers(...a) },
    notification: { create: (...a: unknown[]) => notificationCreate(...a) },
  },
}));

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/cron/recurring-expense-reminders', {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
  });
}

function makeExecution(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'exec-1',
    dueDate: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h overdue by default
    status: 'PENDING',
    recurringExpense: {
      id: 'rec-1',
      name: 'Cotisation Caisse Nationale',
      amount: 50_000,
      organizationId: 'org-1',
      branchId: 'branch-1',
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret');
  findManyExecutions.mockReset();
  findManyMembers.mockReset();
  notificationCreate.mockReset();
  notificationCreate.mockResolvedValue({ id: 'notif-1' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('POST /api/cron/recurring-expense-reminders (PRD F19)', () => {
  it('returns 401 when verifyCronSecret fails', async () => {
    const { verifyCronSecret } = await import('@/lib/server/cron/auth');
    (verifyCronSecret as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    );
    const { POST } = await import('./route');
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('notifies only Treasurers for an execution overdue 24-48h', async () => {
    findManyExecutions.mockResolvedValueOnce([makeExecution()]);
    findManyMembers.mockResolvedValueOnce([{ userId: 'treasurer-1' }]);

    const { POST } = await import('./route');
    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(findManyMembers).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', role: { in: ['TREASURER'] } },
      select: { userId: true },
    });
    expect(notificationCreate).toHaveBeenCalledTimes(1);
    const createArgs = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createArgs.data).toMatchObject({
      userId: 'treasurer-1',
      type: 'recurring_expense_due',
      dedupeKey: 'recurring-reminder:exec-1:24h',
    });
    expect(await res.json()).toEqual({ ok: true, remindersSent: 1, escalationsSent: 0 });
  });

  it('notifies both Treasurers and Pastors for an execution overdue 48h+', async () => {
    findManyExecutions.mockResolvedValueOnce([
      makeExecution({ dueDate: new Date(Date.now() - 50 * 60 * 60 * 1000) }),
    ]);
    findManyMembers.mockResolvedValueOnce([{ userId: 'treasurer-1' }, { userId: 'pastor-1' }]);

    const { POST } = await import('./route');
    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(findManyMembers).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', role: { in: ['TREASURER', 'PASTOR'] } },
      select: { userId: true },
    });
    expect(notificationCreate).toHaveBeenCalledTimes(2);
    const dedupeKeys = notificationCreate.mock.calls.map(
      (c) => (c[0] as { data: { dedupeKey: string } }).data.dedupeKey,
    );
    expect(dedupeKeys).toEqual(['recurring-reminder:exec-1:48h', 'recurring-reminder:exec-1:48h']);
    expect(await res.json()).toEqual({ ok: true, remindersSent: 0, escalationsSent: 2 });
  });

  it('only queries executions still PENDING and at least 24h overdue', async () => {
    findManyExecutions.mockResolvedValueOnce([]);
    const { POST } = await import('./route');
    await POST(makeReq());
    expect(findManyExecutions).toHaveBeenCalledWith({
      where: { status: 'PENDING', dueDate: { lte: expect.any(Date) } },
      include: {
        recurringExpense: {
          select: { id: true, name: true, amount: true, organizationId: true, branchId: true },
        },
      },
    });
  });

  it("source exports runtime = 'nodejs' (Phase 0 guard)", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
  });
});
