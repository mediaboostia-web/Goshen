// frontend/scripts/dev-drain.ts
//
// DEV CONVENIENCE ONLY — never runs in production, never imported by app
// code. In production, Vercel Cron hits /api/cron/outbox-drain and
// /api/cron/email-queue-drain on its own schedule (see vercel.json); under
// `pnpm dev` there is no cron infrastructure at all, so a pending signup /
// resend-verification code sits in the outbox until someone manually POSTs
// both endpoints. This script just does that on a short interval so an
// email sent while developing locally actually arrives instead of sitting
// queued until the code's 15-minute TTL expires.
//
// Usage: pnpm dev:drain   (in a second terminal, alongside `pnpm dev`)
// Stop with Ctrl+C.

const BASE_URL = process.env.DEV_DRAIN_BASE_URL ?? 'http://localhost:3000';
const INTERVAL_MS = Number(process.env.DEV_DRAIN_INTERVAL_MS ?? 10_000);
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error('CRON_SECRET is not set — check .env.local. Aborting.');
  process.exit(1);
}

async function drain(path: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const body = await res.json().catch(() => null);
    return `${path} → ${res.status} ${JSON.stringify(body)}`;
  } catch (err) {
    return `${path} → unreachable (${err instanceof Error ? err.message : String(err)})`;
  }
}

let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
  console.log('\nStopping dev-drain.');
  process.exit(0);
});

async function tick() {
  const outbox = await drain('/api/cron/outbox-drain');
  const emailQueue = await drain('/api/cron/email-queue-drain');
  console.log(`[${new Date().toISOString()}] ${outbox} | ${emailQueue}`);
}

async function main() {
  console.log(`dev-drain: polling ${BASE_URL} every ${INTERVAL_MS}ms — Ctrl+C to stop.`);
  while (!stopped) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

main();
