import type { Metadata } from 'next';
import { Archivo, Space_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';

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
    <html lang="fr" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body className={`${archivo.className} font-sans antialiased`}>
        <ToastProvider>
          <AuthProvider>
            <BranchProvider>{children}</BranchProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
