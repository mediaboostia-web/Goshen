import type { MetadataRoute } from 'next';

// PWA manifest — lets a treasurer install Goshen on their phone home screen
// and open it like a native app. Paired with public/sw.js (offline app
// shell + last-loaded data) so the dashboard stays usable on a bad
// connection instead of showing a browser error.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Goshen — Gestion financière des églises',
    short_name: 'Goshen',
    description:
      'Suivez dîmes, offrandes et dépenses de votre église en temps réel, même sans connexion internet.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fafaf7',
    theme_color: '#0F172A',
    lang: 'fr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
