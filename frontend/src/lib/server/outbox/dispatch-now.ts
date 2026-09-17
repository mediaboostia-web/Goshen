/**
 * Best-effort immediate dispatch for a just-enqueued OutboxEvent — mirrors
 * dispatcher.ts's per-kind render step, but sends right away instead of
 * waiting for the next outbox-drain cron tick (once a day on Vercel Hobby —
 * see vercel.json).
 *
 * Call from within a Next.js `after()` callback so it never adds latency to
 * the caller's response — this also preserves forgot-password's
 * timing-parity invariant (CR-01): the user-exists and no-user branches
 * must take the same wall-clock time, and `after()` runs strictly after the
 * response is sent, so it cannot leak into that measurement.
 *
 * On success, marks the OutboxEvent SENT so the daily outbox-drain cron
 * doesn't redeliver it. On failure, leaves it PENDING — dispatcher.ts's
 * existing retry/backoff path picks it up unchanged, just up to a day later.
 */
import type { PrismaClient } from '@prisma/client';
import type { OutboxEvent } from './types';
import { sendCriticalEmailNow } from '../notifications/send-critical-email-now';
import { createLogger } from '../logger';

const log = createLogger();

export async function tryDispatchNow(
  prisma: PrismaClient,
  outboxId: string,
  event: OutboxEvent,
): Promise<void> {
  let subject: string;
  let html: string;

  switch (event.kind) {
    case 'email.verification_code': {
      const { verificationEmail } = await import('../auth/email-templates');
      const tpl = verificationEmail({
        code: event.payload.code,
        email: event.payload.to,
        expiresAt: event.payload.expiresAt,
      });
      subject = tpl.subject;
      html = tpl.html;
      break;
    }
    case 'email.password_reset': {
      const { resetPasswordEmail } = await import('../auth/email-templates');
      const tpl = resetPasswordEmail({
        code: event.payload.code,
        email: event.payload.to,
        expiresAt: event.payload.expiresAt,
      });
      subject = tpl.subject;
      html = tpl.html;
      break;
    }
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return;
    }
  }

  const sent = await sendCriticalEmailNow({ to: event.payload.to, subject, html });
  if (!sent) return;

  try {
    await prisma.outboxEvent.updateMany({
      where: { id: outboxId, status: 'PENDING' },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (err) {
    // Sent successfully but couldn't mark the row — worst case the daily
    // cron re-sends it once more. Never worth failing over for.
    log.warn('tryDispatchNow: sent but failed to mark OutboxEvent SENT', {
      outboxId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
