'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header / Navbar */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-900 text-white font-serif font-bold text-2xl shadow-sm">
              G
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-emerald-950 block">
                Goshen
              </span>
              <span className="text-xs text-stone-500 font-medium tracking-wide">
                Finances des Églises &bull; Gabon & CEMAC
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="#fonctionnalites" className="hover:text-emerald-900 transition-colors">
              Fonctionnalités
            </a>
            <a href="#multi-annexes" className="hover:text-emerald-900 transition-colors">
              Multi-Annexes
            </a>
            <a href="#tarifs" className="hover:text-emerald-900 transition-colors">
              Tarifs FCFA
            </a>
            <a href="#faq" className="hover:text-emerald-900 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Mon Tableau de Bord &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  Créer mon Église
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-900/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-200 mb-6">
            <span>
              Conçu pour les Assemblées de Dieu et communautés chrétiennes d'Afrique Centrale
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            La gestion financière transparente et responsable de votre église
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-emerald-100/90 max-w-3xl mx-auto font-light leading-relaxed">
            Remplacez définitivement le cahier papier par une plateforme rigoureuse, multi-annexes
            et collaborative. Dîmes, offrandes, dépenses avec reçus et bilans dominicaux générés en
            1 clic.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto rounded-xl bg-amber-500 px-8 py-4 text-base font-bold text-emerald-950 shadow-lg hover:bg-amber-400 transition-all transform hover:-translate-y-0.5"
            >
              Commencer gratuitement &rarr;
            </Link>
            <a
              href="#tarifs"
              className="w-full sm:w-auto rounded-xl border border-emerald-400/30 bg-emerald-900/80 px-8 py-4 text-base font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Découvrir les tarifs en FCFA
            </a>
          </div>

          {/* Social proof highlights */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-emerald-800/50 text-left">
            <div>
              <p className="text-3xl font-serif font-bold text-amber-400">100%</p>
              <p className="text-xs text-emerald-200 mt-1">Conforme au contexte CEMAC & Gabon</p>
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-amber-400">1 tap</p>
              <p className="text-xs text-emerald-200 mt-1">Bascule instantanée entre annexes</p>
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-amber-400">1 clic</p>
              <p className="text-xs text-emerald-200 mt-1">Rapports PDF officiels de culte</p>
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-amber-400">0 trou</p>
              <p className="text-xs text-emerald-200 mt-1">Fin des recomptages et reçus perdus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section id="fonctionnalites" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Pourquoi le cahier papier met en péril les finances de l’église
          </h2>
          <p className="mt-4 text-stone-600 text-base">
            6 trésoriers sur 7 confirment passer plus d’une heure après chaque culte à recompter,
            avec des erreurs récurrentes et des justificatifs de dépenses introuvables.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
            <div className="text-3xl mb-4">📖 &rarr; 📱</div>
            <h3 className="font-serif text-xl font-bold text-emerald-950">
              Saisie numérique post-culte
            </h3>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Dîmes, offrandes ordinaires, dons spéciaux : le trésorier saisit les montants sur son
              téléphone le dimanche. Le solde se calcule automatiquement en temps réel.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
            <div className="text-3xl mb-4">🧾 &rarr; ☁️</div>
            <h3 className="font-serif text-xl font-bold text-emerald-950">
              Reçus photos & Traçabilité
            </h3>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Pour chaque achat ou réparation, prenez une photo du reçu ou de la facture. Fini les
              justificatifs égarés et les contestations budgétaires.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
            <div className="text-3xl mb-4">⏰ &rarr; ✅</div>
            <h3 className="font-serif text-xl font-bold text-emerald-950">
              Validation récurrente en 1 clic
            </h3>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Cotisation caisse nationale, loyer, salaires : recevez une alerte à l’échéance et
              validez le décaissement en 1 clic sans rien oublier.
            </p>
          </div>
        </div>
      </section>

      {/* Multi-branches section */}
      <section id="multi-annexes" className="bg-stone-100 py-20 px-6 border-y border-stone-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 mb-4">
              Supervision de Réseau
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              L’église mère supervise ses 2 à 5 annexes sans jamais se déconnecter
            </h2>
            <p className="mt-4 text-stone-600 text-base leading-relaxed">
              Le pasteur principal ou l’auditeur régional bascule d’une annexe à l’autre en un tap.
              Chaque annexe conserve sa caisse propre, son historique et son trésorier dédié, tandis
              que le siège dispose d’une <strong>Vue Consolidée</strong> pour la coordination
              nationale.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-stone-700">
              <li className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span> Soldes indépendants pour
                chaque lieu de culte
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span> Rôles stricts : Pasteur,
                Trésorier, Secrétaire, Auditeur
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓</span> Alerte automatique si le solde
                descend sous le seuil configuré
              </li>
            </ul>
          </div>

          {/* Interactive preview illustration card */}
          <div className="rounded-2xl border border-stone-300 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-stone-800">
                  Assemblée de Dieu &bull; Siège Libreville
                </span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                Vue consolidée
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
                <span className="text-xs text-stone-500 font-medium">Solde global disponible</span>
                <p className="text-2xl font-serif font-bold text-emerald-950 mt-1">
                  1 845 000{' '}
                  <span className="text-sm font-sans font-normal text-stone-600">FCFA</span>
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
                <span className="text-xs text-stone-500 font-medium">Annexes actives</span>
                <p className="text-2xl font-serif font-bold text-emerald-950 mt-1">
                  4 <span className="text-sm font-sans font-normal text-stone-600">lieux</span>
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs py-2 border-b border-stone-100">
                <span className="text-stone-700 font-medium">Église Mère (Libreville)</span>
                <span className="font-bold text-stone-900">920 000 FCFA</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-stone-100">
                <span className="text-stone-700 font-medium">Annexe Owendo</span>
                <span className="font-bold text-stone-900">450 000 FCFA</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-stone-100">
                <span className="text-stone-700 font-medium">Annexe Ntoum</span>
                <span className="font-bold text-stone-900">285 000 FCFA</span>
              </div>
              <div className="flex justify-between text-xs py-2">
                <span className="text-stone-700 font-medium">Annexe Akanda</span>
                <span className="font-bold text-stone-900">190 000 FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section in FCFA */}
      <section id="tarifs" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 mb-3">
            Tarification Équitable en FCFA
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Des formules adaptées à la taille de chaque communauté
          </h2>
          <p className="mt-4 text-stone-600 text-base">
            Payable simplement par <strong>Airtel Money</strong> et <strong>Moov Money</strong> via
            Chariow. Sans engagement.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {/* Plan Gratuit */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8 flex flex-col justify-between shadow-xs">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">Plan Gratuit</h3>
              <p className="text-xs text-stone-500 mt-1">Idéal pour démarrer et tester</p>
              <div className="mt-6">
                <span className="text-4xl font-serif font-bold text-stone-900">0</span>
                <span className="text-sm font-medium text-stone-600"> FCFA/mois</span>
              </div>
              <ul className="mt-6 space-y-3 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> 1 église (sans annexe)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> 2 utilisateurs (Pasteur +
                  Trésorier)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Saisie entrées/dépenses
                  illimitée
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> 3 modèles de dépenses
                  récurrentes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> 1 rapport PDF par mois
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 block text-center rounded-xl border border-stone-300 py-3 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
            >
              Créer mon compte gratuit
            </Link>
          </div>

          {/* Plan Essentiel (Recommandé) */}
          <div className="rounded-2xl border-2 border-emerald-700 bg-white p-8 flex flex-col justify-between shadow-lg relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-800 px-4 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
              Le plus populaire
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-emerald-950">Plan Essentiel</h3>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                Église locale avec 1 à 3 annexes
              </p>
              <div className="mt-6">
                <span className="text-xs text-stone-400 line-through">5 000 FCFA</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold text-emerald-950">3 500</span>
                  <span className="text-sm font-medium text-stone-600"> FCFA/mois</span>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Jusqu’à 3 annexes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> 10 utilisateurs & rôles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Photos des reçus &
                  justificatifs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Dépenses récurrentes
                  illimitées
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Rapports PDF illimités
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Vue consolidée multi-annexes
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 block text-center rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Choisir le Plan Essentiel
            </Link>
          </div>

          {/* Plan Premium */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8 flex flex-col justify-between shadow-xs">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">Plan Premium</h3>
              <p className="text-xs text-stone-500 mt-1">Grandes assemblées & réseaux régionaux</p>
              <div className="mt-6">
                <span className="text-xs text-stone-400 line-through">20 000 FCFA</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold text-stone-900">15 000</span>
                  <span className="text-sm font-medium text-stone-600"> FCFA/mois</span>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Jusqu’à 10 annexes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Utilisateurs illimités
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Toutes les fonctionnalités
                  Essentiel
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Historique illimité archivé
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Support direct WhatsApp &
                  Téléphone
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 block text-center rounded-xl border border-stone-300 py-3 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
            >
              Choisir le Plan Premium
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-900 text-stone-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white font-serif font-bold text-lg">
              G
            </div>
            <span className="font-serif text-lg font-bold text-white">Goshen Finance</span>
            <span className="text-stone-500">&mdash; La saine gestion au service de la foi.</span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Goshen. Développé pour les églises d’Afrique centrale.
          </p>
        </div>
      </footer>
    </div>
  );
}
