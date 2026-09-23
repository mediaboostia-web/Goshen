// Tripwires for the crawler-facing surface. Every assertion here locks a
// regression that is invisible in the UI but silently costs organic traffic:
// a canonical pointing at the wrong origin, a page listed in the sitemap and
// blocked in robots.txt at the same time, a private route that stops being
// noindexed.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INDEXABLE_PATHS, NON_INDEXABLE_PREFIXES, SITE_DESCRIPTION, SITE_TITLE } from './seo';

// From frontend/src/lib/ → frontend/next.config.ts is 2 levels up.
const NEXT_CONFIG = resolve(__dirname, '../../next.config.ts');
const BRANCH_CONTEXT = resolve(__dirname, '../contexts/BranchContext.tsx');

describe('SEO route inventory', () => {
  it('never lists a path as both indexable and non-indexable', () => {
    // Widened to string[]: both lists are `as const`, so TS would otherwise
    // reject the comparison of two disjoint literal unions — which is
    // exactly the invariant under test, verified at runtime here so it also
    // holds once someone edits one of the two lists.
    const prefixes: string[] = [...NON_INDEXABLE_PREFIXES];
    const conflicting = (INDEXABLE_PATHS as readonly string[]).filter((path) =>
      prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    );
    // A URL submitted in the sitemap and disallowed in robots.txt is the
    // single most common way to get "Indexed, though blocked by robots.txt"
    // in Search Console.
    expect(conflicting).toEqual([]);
  });

  it('keeps next.config.ts X-Robots-Tag prefixes in sync with seo.ts', () => {
    // next.config.ts duplicates the list because it can be loaded by Node's
    // native TypeScript loader, which resolves neither the `@/…` alias nor
    // extensionless relative imports. This test is what makes the duplicate
    // safe.
    const src = readFileSync(NEXT_CONFIG, 'utf8');
    const block = src.match(/const NON_INDEXABLE_PREFIXES = \[([\s\S]*?)\];/);
    expect(block, 'NON_INDEXABLE_PREFIXES not found in next.config.ts').toBeTruthy();

    const declared = [...(block?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(declared).toEqual([...NON_INDEXABLE_PREFIXES]);
  });

  it('treats every indexable public page as reachable without a session', () => {
    // BranchContext redirects logged-out visitors to /login on any path
    // outside PUBLIC_PATHS. Googlebot executes that redirect while
    // rendering, so a public page missing from the set never gets indexed.
    const src = readFileSync(BRANCH_CONTEXT, 'utf8');
    const block = src.match(/const PUBLIC_PATHS = new Set\(\[([\s\S]*?)\]\);/);
    expect(block, 'PUBLIC_PATHS not found in BranchContext.tsx').toBeTruthy();

    const publicPaths = new Set([...(block?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
    const unreachable = INDEXABLE_PATHS.filter((path) => !publicPaths.has(path));
    expect(unreachable).toEqual([]);
  });
});

describe('SERP copy budget', () => {
  it('keeps the homepage title inside the ~60 char SERP width', () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(60);
  });

  it('keeps the homepage description inside the ~160 char SERP width', () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});
