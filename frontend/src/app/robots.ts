import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.APP_URL || 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup'],
        disallow: [
          '/api/',
          '/dashboard',
          '/settings',
          '/transactions',
          '/recurrent-expenses',
          '/reports',
          '/notifications',
          '/subscription',
          '/onboarding',
          '/checkout',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
