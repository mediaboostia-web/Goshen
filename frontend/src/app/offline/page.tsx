import type { Metadata } from 'next';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';

// Not real content — keep it out of search results.
export const metadata: Metadata = {
  title: 'Hors connexion',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col items-center justify-center px-6 text-center font-sans">
      <GoshenWordmark markClassName="h-8 w-8" wordmarkClassName="text-xl" />
      <h1 className="mt-6 font-serif text-2xl sm:text-3xl font-bold text-stone-900">
        Vous êtes hors connexion
      </h1>
      <p className="mt-3 max-w-sm text-sm text-stone-600 leading-relaxed">
        Cette page a besoin d’internet pour se charger la première fois. Vos données déjà consultées
        restent disponibles, et le reste s’affiche dès le retour du réseau.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
      >
        Réessayer
      </a>
    </div>
  );
}
