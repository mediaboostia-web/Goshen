import type { Metadata } from 'next';
import Link from 'next/link';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';

// Replaces Next's unbranded default 404, which offers no way back: a dead
// end absorbs whatever link equity pointed at the broken URL and sends the
// visitor to the back button. Both still answer HTTP 404, which is what
// keeps the URL out of the index.
export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col items-center justify-center px-6 text-center font-sans">
      <GoshenWordmark markClassName="h-8 w-8" wordmarkClassName="text-xl" />
      <p className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-stone-500">
        Erreur 404
      </p>
      <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-stone-900">
        Cette page n’existe pas
      </h1>
      <p className="mt-3 max-w-sm text-sm text-stone-600 leading-relaxed">
        Le lien est peut-être périmé, ou la page a été déplacée.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          Retour à l’accueil
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-emerald-300 hover:text-emerald-900"
        >
          Me connecter
        </Link>
      </div>
    </div>
  );
}
