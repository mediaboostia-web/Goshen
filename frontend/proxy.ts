import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (still backwards
// compatible, but the new name is the supported convention).
//
// This is currently a pass-through. A previous no-op that returned `void`
// and imported nothing at runtime was emitted by the Next 16 build as a raw
// ESM module (`export function middleware`) and then loaded by Node under the
// CommonJS loader on Vercel, crashing every request with
// `SyntaxError: Unexpected token 'export'` -> MIDDLEWARE_INVOCATION_FAILED.
//
// Returning `NextResponse.next()` (a real runtime import from 'next/server')
// forces Next to bundle this file correctly, which avoids that crash. Add the
// real redirect / CSP-nonce logic here when needed.
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
