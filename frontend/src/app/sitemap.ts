import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, SITE_URL } from '@/lib/seo';

// Priority per route — everything else defaults to 0.5. `changeFrequency`
// and `lastModified` are deliberately omitted: Google ignores changefreq,
// and a `lastModified: new Date()` stamped at request time (the previous
// behaviour) claims every page changed on every crawl, which makes the
// signal worthless and gets it discarded wholesale.
const PRIORITY: Record<string, number> = {
  '/': 1,
  '/signup': 0.8,
  '/soutenir': 0.6,
  '/login': 0.3,
  '/confidentialite': 0.3,
  '/protection-des-donnees': 0.3,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    priority: PRIORITY[path] ?? 0.5,
  }));
}
