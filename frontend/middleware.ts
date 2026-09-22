// Silent-refresh gate for protected pages.
//
// The (15-min) access cookie can expire while a (7-day) refresh cookie is
// still valid — typically when a tab sat unfocused or the laptop slept. The
// (authed) layout calling /api/auth/me would 401 and the user would be kicked
// to /login. This middleware catches that case BEFORE the page renders and
// bounces the request through /api/auth/refresh-and-return, which mints fresh
// cookies and 302s back to the original URL — invisible to the user.
//
// Protected paths are configured via AUTH_PROTECTED_PREFIXES (comma-separated,
// e.g. "/dashboard,/account"). Empty by default — the API surface is the only
// thing shipped, so out-of-the-box this middleware is a no-op.
//
// Deliberately does NOT import from 'next/server' (no NextRequest/NextResponse).
// Two confirmed, distinct Next.js 16 + Vercel bugs live in that combination:
//   - a real 'next/server' import crashes at module-load time on Vercel's
//     Node.js runtime (upstream, closed as not planned: vercel/next.js#86434)
//   - a trivial no-op with zero runtime imports gets emitted as unbundled raw
//     ESM ("export function middleware") that Node's CJS loader can't parse
//     (found via live Vercel runtime logs, SyntaxError: Unexpected token
//     'export')
// Standard Web Request/Response (globally available in both the Edge and
// Node.js runtimes) sidesteps the first bug entirely, and real executable
// logic (not just a passthrough return) sidesteps the second. If this still
// crashes on Vercel, the next lever is Project Settings → Functions → Fluid
// Compute (every content-level variant of this file has now been tried).
export function middleware(req: Request): Response | undefined {
  const protectedPrefixes = (process.env.AUTH_PROTECTED_PREFIXES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (protectedPrefixes.length === 0) return undefined;

  const url = new URL(req.url);
  const isProtected = protectedPrefixes.some(
    (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return undefined;

  const cookiePrefix = process.env.COOKIE_PREFIX || 'app';
  const accessCookie = `${cookiePrefix}-token`;
  const refreshCookie = `${cookiePrefix}-refresh`;
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf('=');
        return [pair.slice(0, eq), pair.slice(eq + 1)] as [string, string];
      }),
  );

  if (cookies.has(accessCookie)) return undefined;

  const target = url.pathname + url.search;

  if (!cookies.has(refreshCookie)) {
    const loginPath = process.env.AUTH_LOGIN_PATH || '/login';
    const loginUrl = new URL(loginPath, url.origin);
    loginUrl.search = `?next=${encodeURIComponent(target)}`;
    return Response.redirect(loginUrl, 303);
  }

  const refreshUrl = new URL('/api/auth/refresh-and-return', url.origin);
  refreshUrl.search = `?next=${encodeURIComponent(target)}`;
  return Response.redirect(refreshUrl, 303);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
