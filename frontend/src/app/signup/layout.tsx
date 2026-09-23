import type { Metadata } from 'next';

// page.tsx is a client component and cannot export metadata, so the title
// and description for /signup live here. The canonical resolves itself from
// the root layout's `alternates.canonical: './'`.
export const metadata: Metadata = {
  title: 'Créer le compte de votre église',
  description:
    'Créez gratuitement le compte de votre église sur Goshen en moins de 2 minutes : dîmes, offrandes, dépenses et rapports PDF. Aucune carte bancaire demandée.',
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
