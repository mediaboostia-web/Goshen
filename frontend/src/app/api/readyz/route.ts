/**
 * Readiness probe — "this instance is fit to serve traffic".
 * Pings DB and (if configured) Redis. Returns 503 if either is down so
 * the load balancer routes traffic away until they recover.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { log } from '@/lib/server/observability/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROBE_TIMEOUT_MS = 1_500;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`probe timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};
  let allOk = true;

  {
    const t0 = Date.now();
    try {
      await withTimeout(prisma.$queryRawUnsafe('SELECT 1'), PROBE_TIMEOUT_MS);
      checks.database = { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      allOk = false;
      // Detailed connection errors (hostnames, driver internals) go to the
      // server log only — this probe is unauthenticated by design (load
      // balancers can't hold a bearer token), so its response body must not
      // leak infra details to anonymous callers.
      log.warn('readyz database probe failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      checks.database = {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'unavailable',
      };
    }
  }

  if (redis) {
    const t0 = Date.now();
    try {
      await withTimeout(redis.ping(), PROBE_TIMEOUT_MS);
      checks.redis = { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      allOk = false;
      log.warn('readyz redis probe failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      checks.redis = {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'unavailable',
      };
    }
  }

  return NextResponse.json(
    { ok: allOk, time: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 },
  );
}
