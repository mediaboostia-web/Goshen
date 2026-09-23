// Single source of truth for the public site identity (canonical origin,
// name, pitch). layout.tsx, robots.ts, sitemap.ts and opengraph-image.tsx
// all read from here so a deploy can never ship a canonical pointing at one
// origin and a sitemap pointing at another.

/**
 * The absolute origin every canonical / sitemap / OG URL is built from.
 *
 * Order matters: an explicit APP_URL wins, then Vercel's production domain
 * (a build-time system env var, so a forgotten APP_URL on Vercel degrades to
 * the real domain instead of silently publishing `http://localhost:3000`
 * canonicals — which would de-index the whole site), then localhost for dev.
 *
 * Trailing slashes are stripped so `${SITE_URL}/signup` can never produce a
 * double slash (a distinct URL for a crawler).
 */
export const SITE_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/+$/, '');

export const SITE_NAME = 'Goshen Finance';

/** Public support channels — surfaced in the footer copy AND in the
 * Organization structured data, so they can never drift apart. */
export const SUPPORT_EMAIL = 'goshenstartup@gmail.com';
export const SUPPORT_PHONE_DISPLAY = '+229 01 95 83 11 26';
/** Same number in E.164, the only form schema.org `telephone` accepts. */
export const SUPPORT_PHONE_E164 = '+2290195831126';

export const SITE_TITLE = 'Goshen — Logiciel gratuit de gestion financière pour églises';

// ~157 chars: fits the SERP snippet without truncation, leads with the
// primary query intent ("logiciel gratuit … finances … église") and closes
// on the two differentiators (multi-annexes, hors connexion).
export const SITE_DESCRIPTION =
  'Logiciel gratuit pour gérer les finances de votre église : dîmes, offrandes, dépenses avec reçus, multi-annexes et rapports PDF en 1 clic, même hors connexion.';

/**
 * Public, indexable routes — the sitemap and the crawler-facing docs read
 * this list, so adding a marketing page in one place adds it everywhere.
 * Anything not listed here is either private (robots.ts disallows it) or a
 * transactional page carrying `X-Robots-Tag: noindex` from next.config.ts.
 */
export const INDEXABLE_PATHS = [
  '/',
  '/signup',
  '/login',
  '/soutenir',
  '/confidentialite',
  '/protection-des-donnees',
] as const;

/**
 * Route prefixes that must never be indexed: the authenticated app, the
 * back-office, and the one-shot transactional pages (email verification,
 * password reset, donation receipt) that carry tokens in their query string.
 * Consumed by both robots.ts (crawl) and next.config.ts (X-Robots-Tag).
 */
export const NON_INDEXABLE_PREFIXES = [
  '/admin',
  '/dashboard',
  '/settings',
  '/transactions',
  '/recurrent-expenses',
  '/reports',
  '/notifications',
  '/onboarding',
  '/subscription',
  '/checkout',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/offline',
  '/soutenir/merci',
] as const;
