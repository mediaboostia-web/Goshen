import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Newsreader } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Goshen — Gestion financière des églises',
  description:
    'La plateforme de gestion financière transparente, multi-annexes et responsable pour les églises d’Afrique centrale.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${plusJakartaSans.variable} ${newsreader.variable}`}>
      <body className={`${plusJakartaSans.className} font-sans antialiased`}>
        <ToastProvider>
          <AuthProvider>
            <BranchProvider>{children}</BranchProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
