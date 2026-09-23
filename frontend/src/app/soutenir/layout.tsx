import type { Metadata } from 'next';

// /soutenir is a client component (donation form), so its metadata lives
// here. /soutenir/merci sits under this segment but is kept out of every
// index by the X-Robots-Tag header in next.config.ts — it is a one-shot
// receipt page keyed by a donationId query param.
export const metadata: Metadata = {
  // Not "Soutenir Goshen": the root template appends " — Goshen", which
  // would render the brand twice in the SERP.
  title: 'Soutenir la plateforme',
  description:
    'Goshen est 100 % gratuit pour toutes les églises. Votre don libre finance l’hébergement, le support en français et les prochaines fonctionnalités.',
};

export default function SoutenirLayout({ children }: { children: React.ReactNode }) {
  return children;
}
