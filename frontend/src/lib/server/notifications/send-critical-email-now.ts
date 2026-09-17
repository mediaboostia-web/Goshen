/**
 * Best-effort immediate send for latency-sensitive auth emails (email
 * verification, password reset — both carry a short-lived code, typically
 * 15 minutes). The outbox + cron pipeline (outbox-drain → EmailQueue →
 * email-queue-drain) remains the guaranteed-delivery path: on Vercel's
 * Hobby plan those crons can only run once a day (see vercel.json), which
 * is far too slow for a code that expires in 15 minutes. This bypasses
 * that pipeline for the common case — see outbox/dispatch-now.ts, which
 * calls this right after the enqueueing transaction commits.
 */
import { createMailer, type SendEmailInput } from '../email';
import { createLogger } from '../logger';

const log = createLogger();

export async function sendCriticalEmailNow(input: SendEmailInput): Promise<boolean> {
  try {
    const mailer = createMailer({
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
      EMAIL_FROM: process.env.EMAIL_FROM ?? '',
    });
    await mailer.send(input);
    return true;
  } catch (err) {
    log.warn('sendCriticalEmailNow: immediate send failed, outbox will retry', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
