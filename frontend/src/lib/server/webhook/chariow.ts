// frontend/src/lib/server/webhook/chariow.ts
//
// WebhookProvider adapter that lets the Chariow subscription-billing webhook
// go through the same idempotent, Serializable-transaction factory as
// Bictorys (lib/server/webhook/handler.ts, PROTECTED) instead of the ad-hoc
// handler it used to have.
//
// Chariow authenticates webhooks with a shared secret passed as a QUERY
// STRING parameter (?secret=...) — see Chariow.md — not a header/body
// signature. createWebhookHandler's `verifySignature(rawBody, headers)` has
// no access to the request URL, so the caller (the route file) extracts the
// query secret and binds it into this provider per request via
// `createChariowWebhookProvider(providedSecret)`.
//
// Security fixes vs. the previous inline handler:
//   - Fails CLOSED: if CHARIOW_WEBHOOK_SECRET is unset, every request is
//     rejected. Previously an unset secret meant the check was skipped
//     entirely and the endpoint was open to anyone.
//   - Timing-safe comparison (crypto.timingSafeEqual) instead of `!==`.
//   - Idempotent via the factory's WebhookLog upsert on
//     @@unique([externalId, eventType]) — a replayed delivery for the same
//     purchase + status is deduped instead of re-extending the subscription
//     period by another 30 days.
import 'server-only';
import crypto from 'node:crypto';
import type { ParsedIds, WebhookEventHandler, WebhookProvider } from './handler';
import { mapChariowStatus } from '../payments/chariow';

interface ChariowPurchase {
  id?: string;
  status?: string;
  custom_metadata?: Record<string, string>;
}

export interface ChariowWebhookPayload {
  event?: string;
  type?: string;
  status?: string;
  custom_metadata?: Record<string, string>;
  purchase?: ChariowPurchase;
  data?: {
    purchase?: ChariowPurchase;
    [key: string]: unknown;
  };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function extractPurchase(payload: ChariowWebhookPayload): ChariowPurchase | undefined {
  return (
    payload.data?.purchase ?? payload.purchase ?? (payload.data as ChariowPurchase | undefined)
  );
}

/**
 * Build a Chariow WebhookProvider bound to the secret supplied on THIS
 * request's query string. Construct fresh per request (cheap — no I/O) so
 * `verifySignature` always checks against the current request's `?secret=`.
 */
export function createChariowWebhookProvider(
  providedSecret: string | null,
): WebhookProvider<ChariowWebhookPayload> {
  return {
    name: 'chariow',

    verifySignature() {
      const expected = process.env.CHARIOW_WEBHOOK_SECRET;
      if (!expected) {
        return { valid: false, reason: 'CHARIOW_WEBHOOK_SECRET not configured' };
      }
      if (!providedSecret || !timingSafeStringEqual(providedSecret, expected)) {
        return { valid: false, reason: 'secret mismatch' };
      }
      return { valid: true };
    },

    parsePayload(rawBody) {
      return JSON.parse(rawBody.toString('utf8')) as ChariowWebhookPayload;
    },

    extractIds(payload): ParsedIds {
      const purchase = extractPurchase(payload);
      const purchaseId = purchase?.id;
      const rawStatus = purchase?.status ?? payload.status;
      const status = mapChariowStatus(rawStatus);

      if (!purchaseId) {
        // No purchase id to correlate/dedupe on. Still logged (under a
        // unique synthetic id) rather than silently dropped, but never
        // dispatched to a handler.
        return {
          externalId: `unknown_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          eventType: 'unknown',
          kind: 'other',
        };
      }

      return {
        externalId: purchaseId,
        // Keying dedup on (purchaseId, status) rather than a constant event
        // name: a replay of the SAME status for the SAME purchase dedupes
        // (the point of idempotency), while a legitimate status transition
        // (e.g. pending -> succeeded) is still processed.
        eventType: status,
        kind: status === 'succeeded' ? 'paid' : 'other',
      };
    },
  };
}

/**
 * Activates/renews the organization's subscription on a successful Chariow
 * purchase. Runs inside the factory's Serializable transaction, so it only
 * executes once per (purchaseId, 'succeeded') delivery even under replay.
 */
export const handleChariowPaid: WebhookEventHandler<ChariowWebhookPayload> = async (
  payload,
  tx,
) => {
  const purchase = extractPurchase(payload);
  const customMetadata = purchase?.custom_metadata ?? payload.custom_metadata ?? {};
  const organizationId = customMetadata.organizationId;
  const targetPlan = customMetadata.plan || 'ESSENTIAL';
  const purchaseId = purchase?.id;

  if (!organizationId || !purchaseId) {
    return {};
  }

  const nextPeriodEnd = new Date();
  nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);

  await tx.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan: targetPlan,
      status: 'ACTIVE',
      provider: 'CHARIOW',
      chariowPurchaseId: purchaseId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextPeriodEnd,
    },
    update: {
      plan: targetPlan,
      status: 'ACTIVE',
      chariowPurchaseId: purchaseId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextPeriodEnd,
    },
  });

  await tx.organization.update({
    where: { id: organizationId },
    data: {
      plan: targetPlan,
      planExpiresAt: nextPeriodEnd,
    },
  });

  return {};
};
