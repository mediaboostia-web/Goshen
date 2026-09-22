'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import { Reveal } from '@/components/ui/Reveal';
import {
  CalendarClockIcon,
  CheckCircleIcon,
  LockIcon,
  DownloadIcon,
  MessageCircleIcon,
  UsersGroupIcon,
  DocumentReportIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  ReceiptTextIcon,
} from '@/components/icons/ChurchIcons';

const WHATSAPP_COMMUNITY_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
  'https://chat.whatsapp.com/KeEnHtrfc422rHDiHWXHEb?s=cl&p=a&mlu=4&ilr=4';
const SUPPORT_WHATSAPP_DISPLAY = '+229 01 95 83 11 26';
const SUPPORT_EMAIL = 'goshenstartup@gmail.com';

interface FaqEntry {
  question: string;
  answer: string;
}

// Single source of truth for the FAQ copy — the visible accordion below and
// the FAQPage JSON-LD both read from this instead of keeping two lists in
// sync by hand.
const FAQ_ITEMS: FaqEntry[] = [
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
  {
    question: 'Dois-je abandonner mon cahier ou mon fichier Excel du jour au lendemain ?',
    answer:
      'Non. Vous pouvez démarrer sur le culte suivant et ressaisir l’historique récent à votre rythme.',
  },
  {
    question: 'Ai-je besoin d’une carte bancaire pour essayer ?',
    answer: 'Non, jamais. Goshen est entièrement gratuit — aucune carte bancaire n’est demandée.',
  },
  {
    question: 'Goshen restera-t-il gratuit ?',
    answer:
      'Oui. Goshen est gratuit pour toutes les églises, sans limite de durée ni fonctionnalité cachée derrière un abonnement.',
  },
  {
    question: 'Goshen fonctionne-t-il sans connexion internet ?',
    answer:
      'Oui. Une fois ouverte, l’application reste utilisable hors ligne : vous consultez vos données et continuez la saisie sans réseau. Tout se synchronise automatiquement dès que la connexion revient.',
  },
  {
    question: 'Dans quelle langue est le support ?',
    answer: 'En français, par une équipe qui comprend le fonctionnement d’une église.',
  },
];

// Accordion item for the FAQ section — each manages its own open state
// independently, so multiple answers can stay open at once. The chevron
// sits in a small rounded badge (filled once open) instead of a bare
// number, matching the reference FAQ layout.
function FaqItem({ question, answer, defaultOpen = false }: FaqEntry & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left cursor-pointer"
      >
        <span className="text-sm sm:text-base font-semibold text-stone-900 transition-colors group-hover:text-emerald-900">
          {question}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
            open
              ? 'bg-emerald-700 text-white'
              : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
          }`}
        >
          <ChevronDownIcon
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open && <p className="pb-4 pr-10 text-sm text-stone-600 leading-relaxed">{answer}</p>}
    </div>
  );
}

// Security card — infographic capsule (reference: numbered pill cards with
// a colored icon-half connected by dashed flow lines) instead of a plain
// feature card, recolored to alternate Goshen's emerald/amber instead of
// the reference's teal/purple/blue/pink so it stays on-brand.
function SecurityCard({
  index,
  icon,
  title,
  description,
  accent,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  description: string;
  accent: 'emerald' | 'amber';
}) {
  const accentClasses =
    accent === 'emerald'
      ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white'
      : 'bg-gradient-to-br from-amber-400 to-amber-600 text-emerald-950';

  return (
    <div className="group relative flex items-stretch overflow-hidden rounded-[2.5rem] border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <span className="absolute -left-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-stone-100 bg-white font-serif text-sm font-extrabold text-stone-700 shadow-md">
        {index}
      </span>
      <div
        className={`flex w-20 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105 sm:w-24 ${accentClasses}`}
      >
        {icon}
      </div>
      <div className="flex-1 py-5 pl-5 pr-6">
        <h3 className="font-serif text-base font-bold text-emerald-950 sm:text-lg">{title}</h3>
        <p className="mt-1.5 text-xs text-stone-600 leading-relaxed sm:text-sm">{description}</p>
      </div>
    </div>
  );
}

// Problem-section card — deliberately styled apart from the emerald
// solution cards below (rose accent, no arrow-transition icon) so it reads
// as a pain, not a half-finished feature pitch.
function PainCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-3xl border border-stone-200 bg-white p-7 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-md">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-xl font-bold text-emerald-950">{title}</h3>
      <p className="mt-3 text-sm text-stone-600 leading-relaxed">{description}</p>
    </div>
  );
}

const NAV_LINKS = [
  { href: '#fonctionnalites', label: 'Pourquoi Goshen' },
  { href: '#comment-ca-marche', label: 'Comment ça marche' },
  { href: '#securite', label: 'Sécurité' },
  { href: '#multi-annexes', label: 'Annexes' },
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
      {/* Structured data — SoftwareApplication (rich result eligibility) +
          FAQPage (mirrors the visible FAQ below so Google can surface it
          as an expandable snippet). Kept in sync manually since the FAQ
          copy below is short and rarely changes. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Goshen Finance',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              description:
                'Gestion financière transparente et multi-annexes pour les églises : dîmes, offrandes, dépenses avec reçus et rapports PDF.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'XAF',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
          ]),
        }}
      />

      {/* Header / Navbar — floating rounded pill (reference: HowDo-style
          nav) instead of a full-width bar, with margin around it so the
          page background shows on either side. */}
      <header className="sticky top-4 z-50 px-4 sm:px-6">
        <div
          className={`mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border bg-white/95 px-5 py-2.5 backdrop-blur-md transition-all duration-300 sm:px-6 ${
            scrolled ? 'border-stone-200 shadow-lg' : 'border-stone-200/70 shadow-md'
          }`}
        >
          <GoshenWordmark markClassName="h-6 w-6" wordmarkClassName="text-lg" />

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
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

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Mon Tableau de Bord &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-stone-700 hover:text-emerald-900 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
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
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-700 cursor-pointer hover:bg-stone-50"
          >
            <span className="sr-only">Menu</span>
            <div className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 bg-stone-700" />
              <span className="block h-0.5 w-4 bg-stone-700" />
              <span className="block h-0.5 w-4 bg-stone-700" />
            </div>
          </button>
        </div>

        {mobileNavOpen && (
          <div className="mx-auto mt-2 max-w-5xl space-y-1 rounded-3xl border border-stone-200 bg-white px-6 py-4 shadow-xl md:hidden">
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

      {/* Hero Section — reproduces the reference layout (badge, short bold
          headline with one highlighted word, plain-language description,
          dual CTA, spokesperson photo with decorative shapes behind it)
          recolored to Goshen's emerald/amber palette instead of the
          reference's teal/orange so it stays consistent with every other
          section on the page. Light background throughout — nav blends
          straight into the hero instead of sitting on a separate dark band. */}
      <section className="relative overflow-hidden bg-[#fafaf7] pt-14 pb-16 px-6 sm:pt-20 sm:pb-20 lg:pb-24">
        {/* Small scattered accents standing in for the reference's doodles —
            kept inside the section's own top padding (well above where the
            heading renders) so they never collide with the text, and given
            a gentle continuous float so the hero feels alive even before
            the visitor scrolls. */}
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute left-[6%] top-6 hidden h-2.5 w-2.5 rounded-full bg-amber-400 sm:block"
        />
        <div
          aria-hidden
          className="animate-float-delayed pointer-events-none absolute left-[16%] top-2 hidden select-none text-3xl font-bold text-emerald-200 sm:block"
        >
          +
        </div>
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute right-[6%] top-8 hidden h-3 w-3 rounded-full bg-emerald-300 sm:block"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Wide ambient glow spanning both columns' lower half, so the
              CTA row and the photo read as one continuous, filled zone
              instead of the CTA sitting isolated above empty space. */}
          <div
            aria-hidden
            className="animate-float pointer-events-none absolute -z-10 bottom-[-15%] left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-100/60 via-amber-50/30 to-transparent blur-3xl sm:h-64 lg:h-72"
          />

          {/* Left: pitch */}
          <div className="relative z-10 text-center lg:text-left">
            <Reveal>
              <h1 className="font-serif text-4xl font-extrabold leading-[1.15] tracking-tight text-stone-900 sm:text-5xl lg:text-[3.4rem]">
                La gestion financière
                <br />
                <span className="relative inline-block">
                  simple
                  <svg
                    aria-hidden
                    viewBox="0 0 200 20"
                    preserveAspectRatio="none"
                    className="absolute -bottom-2 left-0 h-4 w-full text-amber-400"
                  >
                    <path
                      d="M2 14 Q 50 2 100 10 T 198 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={5}
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                de votre église
              </h1>
            </Reveal>

            <Reveal delayMs={100}>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-stone-600 sm:text-lg lg:mx-0">
                Suivez dîmes, offrandes et dépenses en temps réel, depuis votre téléphone — même
                sans connexion.
              </p>
            </Reveal>

            <Reveal delayMs={200}>
              <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="w-full transform rounded-full bg-emerald-800 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 sm:w-auto"
                >
                  Commencer gratuitement
                </Link>
                <a
                  href="#comment-ca-marche"
                  className="group inline-flex items-center gap-3 text-sm font-bold text-stone-800"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-all group-hover:border-emerald-300 group-hover:scale-110">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="ml-0.5 h-4 w-4 text-emerald-700"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  Voir comment ça marche
                </a>
              </div>
            </Reveal>

            <Reveal delayMs={300}>
              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-stone-500 lg:justify-start">
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                100% gratuit, aucune carte bancaire &bull; Prêt en moins de 2 minutes
              </p>
            </Reveal>

            {/* 4 Indicateurs clés épurés avec séparateurs verticaux (style référence) */}
            <Reveal delayMs={350}>
              <div className="mt-8 pt-7 border-t border-stone-200/80">
                <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-stone-200 text-center">
                  {/* 1. Hors connexion & mobile */}
                  <div className="px-2 sm:px-3">
                    <div className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-stone-900">
                      100%
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500 leading-snug">
                      hors connexion & mobile
                    </p>
                  </div>

                  {/* 2. Gratuit pour toute église */}
                  <div className="px-2 sm:px-3">
                    <div className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-stone-900">
                      0 FCFA
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500 leading-snug">
                      gratuit pour toute église
                    </p>
                  </div>

                  {/* 3. Dîmes & clôture de culte */}
                  <div className="px-2 sm:px-3">
                    <div className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-stone-900">
                      2 min
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500 leading-snug">
                      dîmes & clôture de culte
                    </p>
                  </div>

                  {/* 4. Facturation & bilans */}
                  <div className="px-2 sm:px-3">
                    <div className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-stone-900">
                      1 clic
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500 leading-snug">
                      factures & bilans PDF
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right: official brand artwork (person + live dashboard mockup +
              decorative shapes already composed by the design team), shown
              directly against the page background — no extra blur blobs
              needed since the asset already carries its own teal accent
              and swoosh, so layering more decoration on top would only
              compete with it. Only one floating card remains, in the one
              spot that's genuinely open, carrying a real claim rather than
              decoration. */}
          <Reveal delayMs={150} className="relative flex justify-center lg:justify-end">
            <img
              src="/photos/image-goshen.png"
              alt="Un utilisateur de Goshen souriant, montrant le tableau de bord de son église sur son téléphone à côté d'un aperçu de l'application"
              width={1662}
              height={946}
              className="relative z-10 h-auto w-full max-w-lg drop-shadow-xl sm:max-w-xl lg:max-w-2xl"
              style={{
                WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 16%, black 100%)',
                maskImage: 'linear-gradient(to top, transparent 0%, black 16%, black 100%)',
              }}
              loading="eager"
            />

            {/* Floating proof card — bottom-left, in the artwork's one
                clearly open patch, carrying a real claim instead of
                decoration */}
            <div className="absolute bottom-6 left-0 z-30 flex items-center gap-2.5 rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-xl transition-transform duration-300 hover:-translate-y-1 sm:left-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircleIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-stone-900">0 trou de caisse</p>
                <p className="text-[10px] text-stone-500">Depuis l’adoption de Goshen</p>
              </div>
            </div>
          </Reveal>

          {/* Full-width close — the photo itself now dissolves via its own
              mask (above), so this is purely a soft colour continuation
              across the whole section width, sitting in the row's own
              bottom padding (top-full, no upward overlap) so it can never
              wash out the CTA or the trust line in the text column. The
              old stats strip can't stay legible under a fade, so it was
              dropped; the floating proof cards keep the real claims and
              stay crisp (z-30) above this band (z-20). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-full z-20 h-16 bg-gradient-to-b from-transparent via-[#fafaf7]/70 to-[#fafaf7] blur-2xl sm:h-20 lg:h-24"
          />
        </div>
      </section>

      {/* Video presentation — right after the hero, so the "Voir comment ça
          marche" pitch has an actual walkthrough to back it up instead of
          only a link further down the page. */}
      <section className="bg-white py-16 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="inline-block rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 mb-3 border border-emerald-100">
              Présentation vidéo
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Goshen en 2 minutes
            </h2>
            <p className="mt-3 text-stone-600 text-sm sm:text-base">
              Un tour rapide du tableau de bord, de la saisie du culte et des rapports PDF.
            </p>
          </Reveal>

          <Reveal delayMs={150}>
            <div className="group relative mt-9 overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
              <video
                controls
                preload="metadata"
                poster="/photos/dashboard-preview.png"
                className="aspect-video w-full"
              >
                <source src="/videos/presentation-goshen.mp4" type="video/mp4" />
              </video>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Problem Section — 3 concrete pains (time / trust / proof), each
          card revealing on scroll with a staggered delay so the section
          feels sequenced rather than dumped on the visitor all at once. */}
      <section
        id="fonctionnalites"
        className="relative overflow-hidden bg-gradient-to-b from-rose-50/50 via-white to-white py-20 px-6"
      >
        <div className="relative mx-auto max-w-7xl">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block rounded-full bg-rose-50 px-3.5 py-1 text-xs font-semibold text-rose-800 mb-3 border border-rose-100">
                Le vrai coût du cahier papier
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
                Combien de dimanches votre trésorier a-t-il déjà perdus ?
              </h2>
              <p className="mt-4 text-stone-600 text-base leading-relaxed">
                Un chiffre qui ne tombe pas juste, et c’est tout le dimanche qui recommence. Le
                papier ne pardonne aucune erreur — et chaque erreur coûte du temps, de l’argent ou
                la confiance de l’église.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-8">
            <Reveal delayMs={0}>
              <PainCard
                icon={<CalendarClockIcon className="h-6 w-6" />}
                title="Plus d’une heure perdue chaque dimanche"
                description="Pendant que la communauté rentre chez elle, le trésorier recompte encore la corbeille à la main — et recommence dès qu’un chiffre ne tombe pas juste."
              />
            </Reveal>
            <Reveal delayMs={150}>
              <PainCard
                icon={<AlertTriangleIcon className="h-6 w-6" />}
                title="Des écarts de caisse jamais expliqués"
                description="Un billet manquant, une dépense oubliée : personne ne sait où est parti l’argent, et le doute s’installe dans l’équipe."
              />
            </Reveal>
            <Reveal delayMs={300}>
              <PainCard
                icon={<ReceiptTextIcon className="h-6 w-6" />}
                title="Des reçus égarés, aucune preuve à montrer"
                description="Sans justificatif retrouvable, impossible de prouver une dépense devant le comité ou l’assemblée."
              />
            </Reveal>
          </div>

          <Reveal delayMs={400}>
            <div className="mt-10 flex justify-center">
              <a
                href="#comment-ca-marche"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                Voir la solution en 3 étapes
                <ChevronDownIcon className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION COMMENT ÇA MARCHE (Placée juste après le problème) */}
      {/* ========================================================= */}
      <section
        id="comment-ca-marche"
        className="relative overflow-hidden bg-gradient-to-br from-emerald-50/70 via-white to-white py-20 px-6"
      >
        <div className="relative mx-auto max-w-7xl grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: 3 Stepped floating cards on organic gradient circle
              (Inspiré de la maquette de référence 1). Ordered after the
              text column on mobile (order-2) so the "Comment ça marche"
              intro reads before the steps illustration, matching desktop's
              left-visual/right-text layout only from lg up. */}
          <div className="order-2 lg:order-1 lg:col-span-6 relative flex justify-center items-center py-6">
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
              <Reveal delayMs={0} className="-ml-2 sm:-ml-4">
                <div className="relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-md">
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
              </Reveal>

              {/* Step 2 (indented to the right) */}
              <Reveal delayMs={150} className="ml-4 sm:ml-8">
                <div className="relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-md">
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
              </Reveal>

              {/* Step 3 */}
              <Reveal delayMs={300} className="-ml-1 sm:ml-0">
                <div className="relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-md">
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
              </Reveal>
            </div>
          </div>

          {/* Right Column: Title, Explanations, Key Metrics & Orbit visual */}
          <Reveal delayMs={150} className="order-1 lg:order-2 lg:col-span-6 relative">
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
              <div className="transition-transform duration-300 hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                  3 min
                </p>
                <p className="text-xs text-stone-500 mt-1 font-medium">Saisie moyenne d'un culte</p>
              </div>
              <div className="transition-transform duration-300 hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                  100%
                </p>
                <p className="text-xs text-stone-500 mt-1 font-medium">Dépenses avec reçus</p>
              </div>
              <div className="transition-transform duration-300 hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">0</p>
                <p className="text-xs text-stone-500 mt-1 font-medium">Écart de caisse</p>
              </div>
            </div>

            {/* Reassurance pill — visible at every breakpoint since most
                treasurers use Goshen from a phone, exactly where a shaky
                connection is most likely. */}
            <div className="flex items-center gap-3 mt-8 text-xs font-medium text-emerald-900 bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200/70">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs">
                ✓
              </div>
              <span>
                Fonctionne même sans connexion internet : la saisie continue hors ligne et se
                synchronise automatiquement dès que le réseau revient.
              </span>
            </div>

            <Link
              href="/signup"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg sm:w-auto"
            >
              Essayer gratuitement &rarr;
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Trust & Security Section — right after "Comment ça marche" so the
          reassurance follows immediately after the pitch. Each card carries
          its own large numeral watermark; hovering (or focusing) a card is
          what "activates" it, so nothing here is a static, faked highlight. */}
      <section id="securite" className="bg-gradient-to-b from-white to-stone-50 py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-3 border border-emerald-100">
                Sécurité & Confiance
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
                L’argent de votre église mérite plus qu’un cahier
              </h2>
              <p className="mt-4 text-stone-600 text-base">
                Goshen est conçu pour que chaque franc encaissé ou décaissé reste traçable, réservé
                aux bonnes personnes, et jamais enfermé chez nous.
              </p>
            </div>
          </Reveal>

          <div className="relative mt-16">
            {/* Dashed connector — decorative flow line echoing the
                reference infographic, hidden below lg since the grid
                stacks to one column there. */}
            <svg
              aria-hidden
              viewBox="0 0 800 260"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 hidden h-full w-full text-emerald-200 lg:block"
            >
              <path
                d="M400 0 V50 M400 210 V260 M50 130 H750"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 8"
              />
            </svg>

            <div className="relative grid gap-6 sm:grid-cols-2">
              <Reveal delayMs={0}>
                <SecurityCard
                  index={1}
                  accent="emerald"
                  icon={<LockIcon className="h-6 w-6" />}
                  title="Chiffrement & hébergement sécurisé"
                  description="Vos données sont chiffrées et hébergées sur une infrastructure sécurisée, jour et nuit."
                />
              </Reveal>
              <Reveal delayMs={100}>
                <SecurityCard
                  index={2}
                  accent="amber"
                  icon={<UsersGroupIcon className="h-6 w-6" />}
                  title="Rôles stricts par utilisateur"
                  description="Pasteur, Trésorier, Secrétaire, Auditeur : chacun ne voit et n’agit que sur ce qui le concerne."
                />
              </Reveal>
              <Reveal delayMs={200}>
                <SecurityCard
                  index={3}
                  accent="amber"
                  icon={<DownloadIcon className="h-6 w-6" />}
                  title="Vos données vous appartiennent"
                  description="Exportez l’intégralité de vos écritures à tout moment. Aucun verrouillage, aucune otage."
                />
              </Reveal>
              <Reveal delayMs={300}>
                <SecurityCard
                  index={4}
                  accent="emerald"
                  icon={<DocumentReportIcon className="h-6 w-6" />}
                  title="Piste d’audit complète"
                  description="Chaque entrée et sortie reste horodatée et attribuée à son auteur, consultable à tout moment."
                />
              </Reveal>
            </div>
          </div>

          <Reveal delayMs={100}>
            <div className="mt-12 flex justify-center">
              <a
                href="#multi-annexes"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg"
              >
                Découvrir la supervision multi-annexes &rarr;
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Multi-branches section */}
      <section id="multi-annexes" className="bg-stone-100 py-20 px-6 border-y border-stone-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div>
              <span className="inline-block rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 mb-4">
                Supervision de Réseau
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                L’église mère supervise ses 2 à 5 annexes sans jamais se déconnecter
              </h2>
              <p className="mt-4 text-stone-600 text-base leading-relaxed">
                Le pasteur principal ou l’auditeur régional bascule d’une annexe à l’autre en un
                tap. Chaque annexe conserve sa caisse propre, son historique et son trésorier dédié,
                tandis que le siège dispose d’une <strong>Vue Consolidée</strong> pour la
                coordination nationale.
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
                  <span className="text-emerald-700 font-bold">✓</span> Alerte automatique si le
                  solde descend sous le seuil configuré
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg"
              >
                Ajouter mes annexes &rarr;
              </Link>
            </div>
          </Reveal>

          {/* Real product screenshot, right next to the pitch — replaces
              the earlier hand-built mockup card with the actual multi-
              annexes dashboard. */}
          <Reveal delayMs={150}>
            <div className="rounded-3xl border border-stone-300/80 bg-emerald-950 p-2 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
              <img
                src="/photos/goshen-desktop.jpg"
                alt="Vue consolidée des annexes de l'église affichée sur le tableau de bord Goshen"
                className="w-full rounded-2xl"
                loading="lazy"
              />
            </div>
          </Reveal>
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
              <Reveal className="lg:col-span-7">
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
              </Reveal>

              {/* Right Column: Community Visual with Photo */}
              <Reveal delayMs={150} className="lg:col-span-5 relative flex justify-center">
                <div className="relative w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-emerald-950 transition-transform duration-500 hover:-translate-y-1">
                  <img
                    src="/photos/goshen-app.jpg"
                    alt="Membre de la communauté Goshen utilisant l'application pendant le culte"
                    className="w-full h-80 sm:h-96 object-cover object-center filter brightness-105"
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
                        {SUPPORT_WHATSAPP_DISPLAY} &bull; Réponse rapide
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bottom Dark Banner Bar (matching Image 3) */}
            <Reveal delayMs={200}>
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ Section — scattered photo collage (all previously unused on
          this page) beside a flat accordion, first question open by
          default. Matches the reference layout more than the old
          category-grid + separate help card. */}
      <section
        id="faq"
        className="bg-gradient-to-b from-stone-50 via-white to-[#fafaf7] py-20 px-6"
      >
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 border border-emerald-100">
                FAQ
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
                Questions fréquentes
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid lg:grid-cols-2 gap-12 items-start">
            {/* Photo collage — hidden below lg, the accordion carries mobile */}
            <Reveal className="relative hidden lg:block h-[480px]">
              <img
                src="/photos/photo-5.jpg"
                alt="Membre de la communauté Goshen à l'église"
                className="absolute left-6 top-0 h-40 w-40 -rotate-6 rounded-2xl border-4 border-white object-cover shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
              />
              <img
                src="/photos/goshen-community.jpg"
                alt="Équipe de trésoriers d'église utilisant Goshen"
                className="absolute right-0 top-4 h-52 w-44 rotate-3 rounded-2xl border-4 border-white object-cover shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
              />
              <img
                src="/photos/goshen-family.jpg"
                alt="Comité paroissial en réunion avec Goshen"
                className="absolute left-16 top-44 z-10 h-64 w-72 -rotate-2 rounded-2xl border-4 border-white object-cover shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
              />
              <img
                src="/photos/photo-2.jpg"
                alt="Collecte de la corbeille pendant le culte"
                className="absolute bottom-0 left-0 z-20 h-36 w-36 rotate-6 rounded-2xl border-4 border-white object-cover shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
              />
            </Reveal>

            {/* Accordion + contact card */}
            <Reveal delayMs={150}>
              <div>
                {FAQ_ITEMS.map((item, i) => (
                  <FaqItem key={item.question} {...item} defaultOpen={i === 0} />
                ))}
              </div>

              <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-800 bg-emerald-950 p-6 text-white shadow-lg sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-800/80">
                    <MessageCircleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold">Une autre question ?</h3>
                    <p className="text-xs text-emerald-100/80">
                      Notre équipe répond en français, sur WhatsApp.
                    </p>
                  </div>
                </div>
                <a
                  href={WHATSAPP_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-emerald-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-400"
                >
                  Écrire sur WhatsApp &rarr;
                </a>
              </div>
            </Reveal>
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
                    Pourquoi Goshen
                  </a>
                </li>
                <li>
                  <a href="#comment-ca-marche" className="hover:text-white transition-colors">
                    Comment ça marche
                  </a>
                </li>
                <li>
                  <a href="#securite" className="hover:text-white transition-colors">
                    Sécurité
                  </a>
                </li>
                <li>
                  <a href="#multi-annexes" className="hover:text-white transition-colors">
                    Annexes
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
                    WhatsApp &mdash; {SUPPORT_WHATSAPP_DISPLAY}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="hover:text-white transition-colors"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li className="text-stone-500 mt-2">Support en français 7j/7</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-stone-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} Goshen Finance. Développé pour les églises.</p>
            <div className="flex items-center gap-5 text-stone-500">
              <Link href="/confidentialite" className="hover:text-white transition-colors">
                Confidentialité
              </Link>
              <Link href="/protection-des-donnees" className="hover:text-white transition-colors">
                Protection des données
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
