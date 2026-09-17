import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMock = vi.fn();
const createMailerMock = vi.fn((..._args: unknown[]) => ({ send: sendMock }));

vi.mock('../email', () => ({
  createMailer: (...args: unknown[]) => createMailerMock(...args),
}));

import { sendCriticalEmailNow } from './send-critical-email-now';

const ORIGINAL_ENV = { ...process.env };

describe('sendCriticalEmailNow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'noreply@example.com';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns true when the mailer sends successfully', async () => {
    sendMock.mockResolvedValue({ id: 'email-1' });

    const ok = await sendCriticalEmailNow({
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Body</p>',
    });

    expect(ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Body</p>',
    });
  });

  it('returns false (never throws) when required env vars are missing', async () => {
    delete process.env.RESEND_API_KEY;
    createMailerMock.mockImplementationOnce(() => {
      throw new Error('createMailer: RESEND_API_KEY is required');
    });

    const ok = await sendCriticalEmailNow({
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Body</p>',
    });

    expect(ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns false (never throws) when the mailer rejects', async () => {
    sendMock.mockRejectedValue(new Error('Resend error: rate limited'));

    const ok = await sendCriticalEmailNow({
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Body</p>',
    });

    expect(ok).toBe(false);
  });
});
