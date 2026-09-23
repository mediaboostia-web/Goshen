import type { MetadataRoute } from 'next';
import { NON_INDEXABLE_PREFIXES, SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The authenticated app, the back-office and the token-carrying
        // transactional pages. Blocking crawl alone does not guarantee
        // de-indexing (a linked URL can still surface without a snippet),
        // so next.config.ts also serves `X-Robots-Tag: noindex` on these
        // same prefixes — belt and braces.
        disallow: ['/api/', ...NON_INDEXABLE_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
