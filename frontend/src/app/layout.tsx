import type { Metadata, Viewport } from 'next';
import { Archivo, Space_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_E164,
} from '@/lib/seo';

// Charte graphique p.07 — "Deux familles, un rôle chacune": Archivo carries
// both titres and texte courant (so `font-sans` AND `font-serif` point at
// it — every existing `font-serif` heading across the app repaints without
// per-page edits), Space Mono is reserved for montants/références/dates.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s — Goshen',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'gestion financière église',
    'logiciel trésorerie église',
    'dîmes et offrandes',
    'comptabilité paroisse',
    'gestion multi-annexes église',
    'Mobile Money église',
  ],
  // './' is resolved against the CURRENT pathname by Next's metadata layer,
  // so every route self-canonicalises from this single line. A literal '/'
  // here (the previous value) was inherited by every page — /signup,
  // /confidentialite… all declared the homepage as their canonical, which
  // tells Google they are duplicates and drops them from the index.
  alternates: {
    canonical: './',
  },
  // Deliberately no title/description/images here: Next fills og:title and
  // og:description from each page's own title/description when they are
  // absent, and opengraph-image.tsx supplies og:image site-wide. Setting
  // them here would pin every shared link to the homepage's copy.
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: './',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Goshen',
  },
};

import { LanguageProvider } from '@/contexts/LanguageContext';

export const viewport: Viewport = {
  themeColor: '#0F172A',
};

// Site-level structured data. It lives in the (server) root layout rather
// than in page.tsx because page.tsx is a client component, where Next strips
// every non-NEXT_PUBLIC env var at build time — SITE_URL would serialise as
// "http://localhost:3000" into the JSON-LD of the production page.
// WebSite tells Google which name to print under the result; Organization
// carries the logo and the support channels.
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: 'Goshen',
      description: SITE_DESCRIPTION,
      inLanguage: 'fr',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: SUPPORT_EMAIL,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: SUPPORT_PHONE_E164,
          email: SUPPORT_EMAIL,
          availableLanguage: ['fr'],
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body className={`${archivo.className} font-sans antialiased`}>
        <script
          type="application/ld+json"
          // `<` is escaped so a future string added to the graph can never
          // close the script tag early.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <BranchProvider>{children}</BranchProvider>
            </AuthProvider>
            <PwaRegister />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
