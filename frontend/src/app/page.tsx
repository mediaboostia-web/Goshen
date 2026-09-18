'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import {
  CoinsHandIcon,
  TrendingUpIcon,
  CameraIcon,
  ShieldCheckIcon,
  CalendarClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LockIcon,
  DownloadIcon,
  MessageCircleIcon,
  UsersGroupIcon,
  DocumentReportIcon,
  ChevronDownIcon,
} from '@/components/icons/ChurchIcons';

const WHATSAPP_COMMUNITY_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL || 'https://wa.me/24176273606';

interface FaqEntry {
  question: string;
  answer: string;
}

// Accordion item for the FAQ section — collapsed by default, one open at a
// time is not enforced (each manages its own state independently, matching
// how most FAQ patterns behave so multiple answers can stay open at once).
function FaqItem({ question, answer }: FaqEntry) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden transition-all duration-200 hover:border-emerald-300">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <span className="text-sm font-semibold text-stone-900">{question}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-700' : ''}`}
        />
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-600 leading-relaxed">{answer}</p>}
    </div>
  );
}

function FaqCategory({ label, items }: { label: string; items: FaqEntry[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
        {label}
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <FaqItem key={item.question} {...item} />
        ))}
      </div>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-lg font-bold text-emerald-950">{title}</h3>
      <p className="mt-2 text-sm text-stone-600 leading-relaxed">{description}</p>
    </div>
  );
}

// Top navbar capped at 5 links (down from 7) — "Comment ça marche" and
// "Communauté" keep their sections and anchors further down the page (and
// their footer links) but no longer compete for space in the header itself.
const NAV_LINKS = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#multi-annexes', label: 'Multi-Annexes' },
  { href: '#securite', label: 'Sécurité' },
  { href: '#tarifs', label: 'Tarifs FCFA' },
  { href: '#faq', label: 'FAQ' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf7] text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-950">
      {/* Header / Navbar */}
      <header
        className={`border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-stone-200 shadow-[0_1px_20px_-4px_rgba(15,23,42,0.12)]'
            : 'border-stone-200/80'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <GoshenWordmark
            tagline="GESTION FINANCIÈRE ECCLÉSIALE"
            markClassName="h-7 w-7"
            wordmarkClassName="text-2xl"
          />

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-emerald-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all transform hover:-translate-y-0.5"
              >
                Mon Tableau de Bord &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all transform hover:-translate-y-0.5"
                >
                  Créer mon Église
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-expanded={mobileNavOpen}
            aria-label="Ouvrir le menu"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-700 cursor-pointer hover:bg-stone-50"
          >
            <span className="sr-only">Menu</span>
            <div className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-stone-700" />
              <span className="block h-0.5 w-5 bg-stone-700" />
              <span className="block h-0.5 w-5 bg-stone-700" />
            </div>
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-stone-200 bg-white px-6 py-4 space-y-1 shadow-lg">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-emerald-800 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Mon Tableau de Bord &rarr;
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-center text-sm font-medium text-stone-700"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-xl bg-emerald-800 px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Créer mon Église
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#042420] via-emerald-950 to-[#021815] text-white py-20 px-6 sm:py-28">
        {/* Decorative gradient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-500/30 to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-16 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tl from-amber-500/20 to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left: headline, pitch, CTAs */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-900/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-200 mb-6 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Conçu pour les églises et communautés chrétiennes</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
                La gestion financière transparente et responsable de votre église
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-emerald-100/90 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                Remplacez définitivement le cahier papier par une plateforme rigoureuse,
                multi-annexes et collaborative. Dîmes, offrandes, dépenses avec reçus et bilans
                dominicaux générés en 1 clic.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto rounded-xl bg-amber-500 px-8 py-4 text-base font-bold text-emerald-950 shadow-lg hover:bg-amber-400 transition-all transform hover:-translate-y-0.5"
                >
                  Commencer gratuitement &rarr;
                </Link>
                <a
                  href="#comment-ca-marche"
                  className="w-full sm:w-auto rounded-xl border border-emerald-400/30 bg-emerald-900/80 px-8 py-4 text-base font-semibold text-white hover:bg-emerald-800 transition-colors"
                >
                  Découvrir comment ça marche
                </a>
              </div>

              <p className="mt-4 flex items-center justify-center lg:justify-start gap-1.5 text-xs text-emerald-200/70">
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
                Aucune carte bancaire requise &bull; Prêt en moins de 2 minutes
              </p>

              {/* Social proof highlights */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-emerald-800/50 text-left">
                <div>
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">100%</p>
                  <p className="text-xs text-emerald-200 mt-1">
                    Pensé pour les trésoriers d’église
                  </p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">1 tap</p>
                  <p className="text-xs text-emerald-200 mt-1">Bascule instantanée entre annexes</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">1 clic</p>
                  <p className="text-xs text-emerald-200 mt-1">Rapports PDF officiels de culte</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">0 trou</p>
                  <p className="text-xs text-emerald-200 mt-1">
                    Fin des recomptages et reçus perdus
                  </p>
                </div>
              </div>
            </div>

            {/* Right: floating live-app preview — makes the pitch concrete
                instead of text-only, reusing the same "Vue consolidée" card
                pattern as the Multi-Annexes section further down. */}
            <div className="lg:col-span-5 relative hidden sm:block">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-500/10 to-transparent blur-2xl"
              />
              <div className="relative rounded-3xl bg-white p-5 shadow-2xl border border-white/10 rotate-2 hover:rotate-0 transition-transform duration-500 mx-auto max-w-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-stone-800">
                      Église de la Grâce &bull; Culte du dimanche
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-stone-500 font-medium">Solde disponible</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-serif font-bold text-emerald-950">
                      1 845 000 <span className="text-sm font-sans text-stone-500">FCFA</span>
                    </p>
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                      <TrendingUpIcon className="h-3 w-3" /> +23,5%
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CoinsHandIcon className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span className="text-xs font-medium text-stone-800 truncate">
                        Dîmes & offrandes
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 shrink-0">+45 000</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CameraIcon className="h-4 w-4 text-stone-500 shrink-0" />
                      <span className="text-xs font-medium text-stone-800 truncate">
                        Sonorisation &mdash; reçu joint
                      </span>
                    </div>
                    <span className="text-xs font-bold text-stone-600 shrink-0">&minus;12 000</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-950 px-3 py-2.5 text-white">
                  <DocumentReportIcon className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span className="text-[11px] font-semibold">
                    Bilan du culte généré &bull; PDF prêt
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section id="fonctionnalites" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 mb-3 border border-emerald-100">
            Fin des erreurs & du papier
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Pourquoi le cahier papier met en péril les finances de l’église
          </h2>
          <p className="mt-4 text-stone-600 text-base leading-relaxed">
            6 trésoriers sur 7 confirment passer plus d’une heure après chaque culte à recompter,
            avec des erreurs récurrentes et des justificatifs de dépenses introuvables.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-8">
          <div className="rounded-3xl border border-stone-200 bg-white p-7 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4 text-emerald-700">
              <CoinsHandIcon className="h-7 w-7" />
              <ArrowRightIcon className="h-4 w-4 text-stone-400" />
              <TrendingUpIcon className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-emerald-950">
              Saisie numérique post-culte
            </h3>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Dîmes, offrandes ordinaires, dons spéciaux : le trésorier saisit les montants sur son
              téléphone le dimanche. Le solde se calcule automatiquement en temps réel.
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-7 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4 text-emerald-700">
              <CameraIcon className="h-7 w-7" />
              <ArrowRightIcon className="h-4 w-4 text-stone-400" />
              <ShieldCheckIcon className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-emerald-950">
              Reçus photos & Traçabilité
            </h3>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Pour chaque achat ou réparation, prenez une photo du reçu ou de la facture. Fini les
              justificatifs égarés et les contestations budgétaires.
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-7 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4 text-emerald-700">
              <CalendarClockIcon className="h-7 w-7" />
              <ArrowRightIcon className="h-4 w-4 text-stone-400" />
              <CheckCircleIcon className="h-7 w-7" />
            </div>
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

      {/* ========================================================= */}
      {/* SECTION COMMENT ÇA MARCHE (Placée juste après le problème) */}
      {/* ========================================================= */}
      <section id="comment-ca-marche" className="py-20 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: 3 Stepped floating cards on organic gradient circle (Inspiré de la maquette de référence 1) */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6">
            {/* Organic backdrop circle with soft emerald glow */}
            <div
              aria-hidden
              className="absolute h-80 w-80 sm:h-96 sm:w-96 rounded-full bg-gradient-to-tr from-emerald-100 via-emerald-200/50 to-teal-50/30 blur-xl opacity-90"
            />
            <div
              aria-hidden
              className="absolute -left-6 top-1/2 -translate-y-1/2 h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-emerald-100/70 pointer-events-none"
            />

            {/* Stepped cards container */}
            <div className="relative w-full max-w-md space-y-6 z-10">
              {/* Step 1 */}
              <div className="relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-md -ml-2 sm:-ml-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 font-serif text-lg font-extrabold text-emerald-800 shadow-xs">
                    1
                  </span>
                  <div>
                    <h3 className="font-serif text-base font-bold text-emerald-950">
                      Saisie numérique du culte
                    </h3>
                    <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                      Dîmes, offrandes ordinaires et dons spéciaux : le trésorier enregistre les
                      montants en 3 minutes sur son smartphone le dimanche.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 (indented to the right) */}
              <div className="relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-md ml-4 sm:ml-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 font-serif text-lg font-extrabold text-emerald-800 shadow-xs">
                    2
                  </span>
                  <div>
                    <h3 className="font-serif text-base font-bold text-emerald-950">
                      Justification & Reçus photos
                    </h3>
                    <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                      Pour chaque achat ou dépense, prenez le justificatif en photo et validez les
                      sorties récurrentes en 1 clic. Zéro justificatif égaré.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-md -ml-1 sm:ml-0">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 font-serif text-lg font-extrabold text-emerald-800 shadow-xs">
                    3
                  </span>
                  <div>
                    <h3 className="font-serif text-base font-bold text-emerald-950">
                      Clôture & Bilan instantané
                    </h3>
                    <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                      Le solde consolidé est calculé automatiquement. Le rapport dominical PDF est
                      généré et transmis au pasteur et au comité sans délai.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Explanations, Key Metrics & Orbit visual */}
          <div className="lg:col-span-6 relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-4 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Comment ça marche
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight leading-tight">
              La clarté financière de votre église{' '}
              <span className="text-emerald-700">en 3 étapes simples</span>
            </h2>

            <p className="mt-5 text-stone-600 text-base sm:text-lg leading-relaxed font-light">
              Fini les heures de calculs tard le dimanche soir, les cahiers introuvables et les
              erreurs de caisse. Goshen structure chaque flux financier de façon limpide, de
              l’encaissement de la corbeille jusqu’à la consolidation multi-annexes.
            </p>

            {/* Key Metrics / Stats */}
            <div className="mt-10 grid grid-cols-3 gap-6 pt-8 border-t border-stone-200">
              <div>
                <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                  3 min
                </p>
                <p className="text-xs text-stone-500 mt-1 font-medium">Saisie moyenne d'un culte</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                  100%
                </p>
                <p className="text-xs text-stone-500 mt-1 font-medium">Dépenses avec reçus</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">0</p>
                <p className="text-xs text-stone-500 mt-1 font-medium">Écart de caisse</p>
              </div>
            </div>

            {/* Reassurance pill */}
            <div className="hidden sm:flex items-center gap-3 mt-8 text-xs font-medium text-emerald-900 bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200/70">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs">
                ✓
              </div>
              <span>
                Accessible sur smartphone, tablette et ordinateur sans installation complexe.
              </span>
            </div>
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
          <div className="rounded-3xl border border-stone-300/80 bg-white p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-stone-800">
                  Assemblée de Dieu &bull; Siège Libreville
                </span>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60">
                Vue consolidée
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
                <span className="text-xs text-stone-500 font-medium">Solde global disponible</span>
                <p className="text-2xl font-serif font-bold text-emerald-950 mt-1">
                  1 845 000{' '}
                  <span className="text-sm font-sans font-normal text-stone-600">FCFA</span>
                </p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
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
          <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1 text-xs font-semibold text-amber-900 mb-3 border border-amber-200">
            Tarification Équitable en FCFA
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Des formules adaptées à la taille de chaque communauté
          </h2>
          <p className="mt-4 text-stone-600 text-base">
            Payable simplement par <strong>Airtel Money</strong> et <strong>Moov Money</strong>.
            Sans engagement.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {/* Plan Gratuit */}
          <div className="rounded-3xl border border-stone-200 bg-white p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
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
          <div className="rounded-3xl border-2 border-emerald-700 bg-white p-8 flex flex-col justify-between shadow-lg relative transform hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-800 px-4 py-1 text-[11px] font-bold text-white uppercase tracking-wider shadow-sm">
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
          <div className="rounded-3xl border border-stone-200 bg-white p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
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

      {/* ========================================================= */}
      {/* SECTION COMMUNAUTÉ WHATSAPP & CONTACT (Inspirée image 3) */}
      {/* ========================================================= */}
      <section id="communaute" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-[#faf9f5] shadow-lg">
          {/* Subtle warm background glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl"
          />

          <div className="relative p-6 sm:p-10 lg:p-14">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Heading & Feature Points */}
              <div className="lg:col-span-7">
                <div className="space-y-2">
                  <p className="font-serif text-lg sm:text-xl text-stone-700">Rejoignez la</p>
                  <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-950 tracking-tight leading-tight">
                    Communauté <br />
                    <span className="text-emerald-800">WhatsApp Goshen</span>
                  </h2>
                </div>

                {/* Triangle bullet list matching Image 3 */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <span className="text-sm font-bold text-amber-600 mt-0.5 select-none">▲</span>
                    <div>
                      <p className="text-base sm:text-lg font-semibold text-stone-900">
                        Posez vos questions
                      </p>
                      <p className="text-xs sm:text-sm text-stone-600">
                        Échangez directement avec notre équipe et d'autres trésoriers d'églises.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <span className="text-sm font-bold text-amber-600 mt-0.5 select-none">▲</span>
                    <div>
                      <p className="text-base sm:text-lg font-semibold text-stone-900">
                        Partagez vos idées
                      </p>
                      <p className="text-xs sm:text-sm text-stone-600">
                        Proposez des améliorations pour adapter Goshen à vos besoins réels.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <span className="text-sm font-bold text-amber-600 mt-0.5 select-none">▲</span>
                    <div>
                      <p className="text-base sm:text-lg font-semibold text-stone-900">
                        Envoyez vos captures d’écran
                      </p>
                      <p className="text-xs sm:text-sm text-stone-600">
                        En cas d'interrogation sur un rapport ou une saisie, obtenez un guidage
                        direct.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <span className="text-sm font-bold text-amber-600 mt-0.5 select-none">▲</span>
                    <div>
                      <p className="text-base sm:text-lg font-semibold text-stone-900">
                        Recevez de l’aide rapidement
                      </p>
                      <p className="text-xs sm:text-sm text-stone-600">
                        Une assistance réactive en français, par une équipe dédiée aux ministères.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Community Visual with Photo */}
              <div className="lg:col-span-5 relative flex justify-center">
                <div className="relative w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-emerald-950">
                  <img
                    src="/photos/community-woman.jpg"
                    alt="Membre de la communauté WhatsApp Goshen"
                    className="w-full h-80 sm:h-96 object-cover object-top filter brightness-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent pointer-events-none" />

                  {/* Floating badge over photo */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 backdrop-blur-md p-3 shadow-lg border border-stone-100 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <MessageCircleIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate">
                        Communauté Active WhatsApp
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">
                        +241 76 27 36 06 &bull; Réponse rapide
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Dark Banner Bar (matching Image 3) */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-[#21142a] via-[#1a2e2b] to-[#0c2420] p-4 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="text-amber-400 font-bold text-lg select-none hidden sm:inline">
                  ▲
                </span>
                <p className="text-sm sm:text-base font-medium text-emerald-50">
                  Échangez directement avec{' '}
                  <strong className="text-white font-semibold">l’équipe Goshen</strong> et les
                  autres utilisateurs.
                </p>
              </div>

              <a
                href={WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold px-6 py-3 text-sm transition-all shadow-md shrink-0 transform hover:scale-[1.02]"
              >
                <MessageCircleIcon className="h-4 w-4" />
                <span>Rejoindre sur WhatsApp &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section id="securite" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-3 border border-emerald-100">
            Sécurité & Confiance
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            L’argent de votre église mérite plus qu’un cahier
          </h2>
          <p className="mt-4 text-stone-600 text-base">
            Goshen est conçu pour que chaque franc encaissé ou décaissé reste traçable, réservé aux
            bonnes personnes, et jamais enfermé chez nous.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <TrustCard
            icon={<LockIcon className="h-5 w-5" />}
            title="Chiffrement & hébergement sécurisé"
            description="Vos données sont chiffrées et hébergées sur une infrastructure sécurisée, jour et nuit."
          />
          <TrustCard
            icon={<UsersGroupIcon className="h-5 w-5" />}
            title="Rôles stricts par utilisateur"
            description="Pasteur, Trésorier, Secrétaire, Auditeur : chacun ne voit et n’agit que sur ce qui le concerne."
          />
          <TrustCard
            icon={<DownloadIcon className="h-5 w-5" />}
            title="Vos données vous appartiennent"
            description="Exportez l’intégralité de vos écritures à tout moment. Aucun verrouillage, aucune otage."
          />
          <TrustCard
            icon={<DocumentReportIcon className="h-5 w-5" />}
            title="Piste d’audit complète"
            description="Chaque entrée et sortie reste horodatée et attribuée à son auteur, consultable à tout moment."
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 mb-3 border border-stone-200">
            Questions Fréquentes
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Les réponses avant de vous lancer
          </h2>
        </div>

        <div className="mt-14 grid lg:grid-cols-3 gap-10">
          {/* Help card */}
          <div className="rounded-3xl border border-emerald-800 bg-emerald-950 p-7 text-white h-fit shadow-lg">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-800/80">
              <MessageCircleIcon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-bold">Une autre question ?</h3>
            <p className="mt-2 text-sm text-emerald-100/80 leading-relaxed">
              Notre équipe répond en français, directement sur WhatsApp ou par e-mail.
            </p>
            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              Écrire sur WhatsApp &rarr;
            </a>
          </div>

          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-x-8 gap-y-10">
            <FaqCategory
              label="Sécurité & données"
              items={[
                {
                  question: 'Mes données financières sont-elles en sécurité ?',
                  answer:
                    'Oui. Vos données sont chiffrées et hébergées sur une infrastructure sécurisée, avec des rôles stricts par utilisateur.',
                },
                {
                  question: 'Puis-je récupérer mes données si je change de plateforme ?',
                  answer:
                    'Oui, à tout moment. Vos écritures vous appartiennent et restent exportables — aucun verrouillage.',
                },
              ]}
            />
            <FaqCategory
              label="Démarrage & migration"
              items={[
                {
                  question:
                    'Dois-je abandonner mon cahier ou mon fichier Excel du jour au lendemain ?',
                  answer:
                    'Non. Vous pouvez démarrer sur le culte suivant et ressaisir l’historique récent à votre rythme.',
                },
                {
                  question: 'Ai-je besoin d’une carte bancaire pour essayer ?',
                  answer: 'Non. Le plan gratuit ne demande aucune carte bancaire.',
                },
              ]}
            />
            <FaqCategory
              label="Tarifs & annexes"
              items={[
                {
                  question: 'Comment fonctionne la facturation pour plusieurs annexes ?',
                  answer:
                    'Chaque formule inclut un nombre d’annexes (jusqu’à 3 en Essentiel, jusqu’à 10 en Premium), facturées en un seul abonnement pour tout le réseau.',
                },
                {
                  question: 'Puis-je changer de formule à tout moment ?',
                  answer: 'Oui, sans engagement, directement depuis les réglages de votre compte.',
                },
              ]}
            />
            <FaqCategory
              label="Support"
              items={[
                {
                  question: 'Dans quelle langue est le support ?',
                  answer:
                    'En français, par une équipe qui comprend le fonctionnement d’une église.',
                },
                {
                  question: 'Quels moyens de paiement acceptez-vous ?',
                  answer: 'Airtel Money et Moov Money, réglables directement en FCFA.',
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-stone-200 bg-stone-900 text-stone-400 py-16 px-6">
        {/* Giant faint wordmark watermark */}
        <p
          aria-hidden
          className="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap font-serif font-extrabold text-white/5 text-[6rem] sm:text-[9rem] leading-none"
        >
          GOSHEN
        </p>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
            <div>
              <GoshenWordmark variant="creme" markClassName="h-6 w-6" wordmarkClassName="text-lg" />
              <p className="mt-3 text-xs text-stone-500 leading-relaxed">
                La saine gestion au service de la foi.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
                Produit
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#fonctionnalites" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#comment-ca-marche" className="hover:text-white transition-colors">
                    Comment ça marche
                  </a>
                </li>
                <li>
                  <a href="#multi-annexes" className="hover:text-white transition-colors">
                    Multi-Annexes
                  </a>
                </li>
                <li>
                  <a href="#securite" className="hover:text-white transition-colors">
                    Sécurité
                  </a>
                </li>
                <li>
                  <a href="#tarifs" className="hover:text-white transition-colors">
                    Tarifs FCFA
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
                Compte & Communauté
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    Créer mon église
                  </Link>
                </li>
                <li>
                  <a href="#communaute" className="hover:text-white transition-colors">
                    Communauté WhatsApp
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
                Contact
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href={WHATSAPP_COMMUNITY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <MessageCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
                    WhatsApp &mdash; +241 76 27 36 06
                  </a>
                </li>
                <li className="text-stone-500 mt-2">Support en français 7j/7</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-stone-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} Goshen Finance. Développé pour les églises.</p>
            <p className="text-stone-500">Transparence, traçabilité et simplicité.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
