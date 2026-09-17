import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

const sendCriticalEmailNowMock = vi.fn();

vi.mock('../notifications/send-critical-email-now', () => ({
  sendCriticalEmailNow: (...args: unknown[]) => sendCriticalEmailNowMock(...args),
}));

import { tryDispatchNow } from './dispatch-now';

function makePrismaStub() {
  return {
    outboxEvent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as unknown as PrismaClient;
}

describe('tryDispatchNow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the verification-code template, sends it, and marks the row SENT on success', async () => {
    sendCriticalEmailNowMock.mockResolvedValue(true);
    const prisma = makePrismaStub();

    await tryDispatchNow(prisma, 'outbox-1', {
      kind: 'email.verification_code',
      payload: { to: 'user@example.com', code: 'ABCD2345', expiresAt: new Date().toISOString() },
    });

    expect(sendCriticalEmailNowMock).toHaveBeenCalledTimes(1);
    const arg = sendCriticalEmailNowMock.mock.calls[0]?.[0];
    expect(arg.to).toBe('user@example.com');
    expect(arg.subject).toBeTruthy();
    expect(arg.html).toContain('ABCD2345');

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: 'outbox-1', status: 'PENDING' },
      data: { status: 'SENT', sentAt: expect.any(Date) },
    });
  });

  it('renders the password-reset template for that event kind', async () => {
    sendCriticalEmailNowMock.mockResolvedValue(true);
    const prisma = makePrismaStub();

    await tryDispatchNow(prisma, 'outbox-2', {
      kind: 'email.password_reset',
      payload: { to: 'user@example.com', code: 'WXYZ6789', expiresAt: new Date().toISOString() },
    });

    const arg = sendCriticalEmailNowMock.mock.calls[0]?.[0];
    expect(arg.html).toContain('WXYZ6789');
  });

  it('leaves the OutboxEvent row untouched when the send fails', async () => {
    sendCriticalEmailNowMock.mockResolvedValue(false);
    const prisma = makePrismaStub();

    await tryDispatchNow(prisma, 'outbox-3', {
      kind: 'email.verification_code',
      payload: { to: 'user@example.com', code: 'ABCD2345', expiresAt: new Date().toISOString() },
    });

    expect(prisma.outboxEvent.updateMany).not.toHaveBeenCalled();
  });

  it('never throws when the DB update itself fails after a successful send', async () => {
    sendCriticalEmailNowMock.mockResolvedValue(true);
    const prisma = makePrismaStub();
    (prisma.outboxEvent.updateMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      tryDispatchNow(prisma, 'outbox-4', {
        kind: 'email.verification_code',
        payload: { to: 'user@example.com', code: 'ABCD2345', expiresAt: new Date().toISOString() },
      }),
    ).resolves.toBeUndefined();
  });
});
