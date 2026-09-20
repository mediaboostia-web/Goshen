import type { Metadata, Viewport } from 'next';
import { Archivo, Space_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';
import { PwaRegister } from '@/components/pwa/PwaRegister';

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

const SITE_URL = process.env.APP_URL || 'http://localhost:3000';
const SITE_DESCRIPTION =
  'Remplacez le cahier papier par une gestion financière claire pour votre église : dîmes, offrandes, dépenses avec reçus et rapports PDF en 1 clic. Paiement par Mobile Money.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Goshen — Gestion financière des églises',
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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'Goshen Finance',
    title: 'Goshen — Gestion financière transparente pour les églises',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/photos/dashboard-preview.png',
        width: 1200,
        height: 630,
        alt: 'Tableau de bord Goshen Finance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goshen — Gestion financière transparente pour les églises',
    description: SITE_DESCRIPTION,
    images: ['/photos/dashboard-preview.png'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body className={`${archivo.className} font-sans antialiased`}>
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
