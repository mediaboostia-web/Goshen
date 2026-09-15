/**
 * POST /api/webhooks/chariow — Chariow subscription-billing webhook.
 *
 * Routed through the same battle-tested factory as Bictorys
 * (lib/server/webhook/handler.ts, PROTECTED): raw-body read, signature
 * verification, Serializable transaction, WebhookLog upsert + dedup.
 *
 * Chariow authenticates via a `?secret=` query string param rather than a
 * header/body signature (see Chariow.md), so the provider is constructed
 * per-request with the secret bound in — see
 * lib/server/webhook/chariow.ts for the fail-closed + timing-safe checks.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { createChariowWebhookProvider, handleChariowPaid } from '@/lib/server/webhook/chariow';
import { prisma } from '@/lib/server/prisma';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const providedSecret = searchParams.get('secret');

  const handler = createWebhookHandler({
    prisma,
    provider: createChariowWebhookProvider(providedSecret),
    onPaid: handleChariowPaid,
  });

  return handler(req);
}
