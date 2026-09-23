import type { Metadata } from 'next';

// Same pattern as signup/layout.tsx: /login is a client component, so its
// metadata is declared by the segment layout instead.
export const metadata: Metadata = {
  title: 'Connexion',
  description:
    'Connectez-vous à Goshen pour suivre les dîmes, offrandes et dépenses de votre église et générer vos rapports.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
