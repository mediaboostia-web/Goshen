import type { NextRequest } from 'next/server';

// No-op placeholder.
//
// This file used to implement a silent-refresh gate for protected pages
// (redirect through /api/auth/refresh-and-return when the access cookie
// expired but the refresh cookie was still valid). It's disabled for now:
//
//   1. AUTH_PROTECTED_PREFIXES is unset in Production, so the old logic
//      never actually did anything there anyway (see git history for the
//      full implementation, removed in 45059b0/this commit).
//   2. Any middleware/proxy on this Next.js 16 + Vercel combination that
//      imports from 'next/server' at runtime crashes at module-load time —
//      confirmed via live Vercel logs, upstream bug closed as not planned
//      (vercel/next.js#86434). `import type` is erased at compile time, so
//      this file has zero runtime import of 'next/server' and cannot hit
//      that crash.
//   3. Deleting the file outright (tried first) caused Vercel to 404 every
//      route instead — Next 16's Vercel build-output generation appears to
//      need a middleware/proxy file present, even a no-op one, to emit a
//      correct routing table.
//
// The client-side api() wrapper already auto-refreshes on 401, so pages
// aren't broken without this. Re-enable the real redirect logic (git log
// has it) only after confirming NextResponse/NextRequest runtime imports
// no longer crash middleware on this Vercel project.
export function middleware(_req: NextRequest): void {
  // Intentional no-op.
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
