'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import { Reveal } from '@/components/ui/Reveal';
import {
  CalendarClockIcon,
  CheckCircleIcon,
  DownloadIcon,
  MessageCircleIcon,
  UsersGroupIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  ReceiptTextIcon,
  CloudSyncIcon,
  PhoneIcon,
} from '@/components/icons/ChurchIcons';

const WHATSAPP_COMMUNITY_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
  'https://chat.whatsapp.com/KeEnHtrfc422rHDiHWXHEb?s=cl&p=a&mlu=4&ilr=4';
const SUPPORT_WHATSAPP_DISPLAY = '+229 01 95 83 11 26';
const SUPPORT_EMAIL = 'goshenstartup@gmail.com';
const SUPPORT_PHONE_DISPLAY = '+241 62 45 15 22';
const SUPPORT_PHONE_E164 = '+24162451522';

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
      {/* Rendered unconditionally and hidden with `hidden` rather than
          mounted on open: a collapsed answer that never reaches the DOM is
          invisible to crawlers (and to the AI answer engines that read the
          raw HTML without executing JS), so the FAQPage JSON-LD below would
          describe text no crawler can actually find on the page. */}
      <p hidden={!open} className="pb-4 pr-10 text-sm text-stone-600 leading-relaxed">
        {answer}
      </p>
    </div>
  );
}

// Feature showcase — scroll-spy list + sticky photo panel (reference:
// fintech "Financial Solutions" section — numbered list on the left, the
// active item's photo pinned on the right with a floating stat badge).
// IntersectionObserver drives which item is "active" as the list scrolls
// through the vertical center band of the viewport, so the photo panel
// changes hands-free while scrolling — clicking an item also jumps to it
// directly, so the interaction isn't scroll-only. Below `lg` there's no
// room for a two-column sticky layout, so mobile gets its own simpler
// stacked rendering: same photo + copy per feature, no observer.
interface ShowcaseFeature {
  icon: ReactNode;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  fit: 'contain' | 'cover';
  statValue: string;
  statLabel: string;
}

const SHOWCASE_FEATURES: ShowcaseFeature[] = [
  {
    icon: <CloudSyncIcon className="h-5 w-5" />,
    title: 'Pas de connexion ? Continuez quand même.',
    description:
      'Au culte, la connexion peut ralentir ou disparaître. Vous continuez à enregistrer les dîmes, offrandes et dépenses hors ligne — tout se synchronise dès que la connexion revient.',
    image: '/photos/hero-section.png',
    imageAlt:
      'Une utilisatrice de Goshen consultant le solde de trésorerie de son église sur son téléphone',
    fit: 'contain',
    statValue: '100 %',
    statLabel: 'Disponible hors-ligne',
  },
  {
    icon: <UsersGroupIcon className="h-5 w-5" />,
    title: 'Chacun son rôle. Tout le monde voit clair.',
    description:
      'Le pasteur supervise. Le trésorier enregistre. L’auditeur vérifie. Chaque personne dispose uniquement des accès dont elle a besoin.',
    image: '/photos/photo-3.jpg',
    imageAlt: 'Une équipe paroissiale répartissant les responsabilités autour de la trésorerie',
    fit: 'cover',
    statValue: '3',
    statLabel: 'Rôles distincts',
  },
  {
    icon: <DownloadIcon className="h-5 w-5" />,
    title: 'Votre bilan est prêt quand vous l’êtes.',
    description:
      'Plus besoin de reprendre les cahiers pour préparer le rapport du dimanche. Goshen consolide vos données et génère votre rapport PDF en un clic.',
    image: '/photos/image-goshen.png',
    imageAlt: 'Un trésorier présentant le rapport PDF généré automatiquement par Goshen',
    fit: 'contain',
    statValue: '1 clic',
    statLabel: 'Rapport PDF',
  },
];

function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = itemRefs.current.findIndex((el) => el === entry.target);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-24">
      {/* Its own eyebrow/title/description — distinguishes this showcase
        from the multi-annexes block above instead of borrowing that
        block's H2, which otherwise read as one long, undifferentiated
        wall of content. */}
      <Reveal>
        <div className="mx-auto max-w-xl text-center">
          <span className="mb-3 inline-block rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Fonctionnalités clés
          </span>
          <h3 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            Ce qui change dès le premier dimanche
          </h3>
          <p className="mt-3 text-base leading-relaxed text-stone-600">
            Trois fonctionnalités pensées pour le terrain : simples à utiliser, fiables à tout
            moment.
          </p>
        </div>
      </Reveal>

      {/* Desktop — interactive scroll-spy: list left, sticky square photo
        right. Capped at max-w-md and right-aligned (ml-auto) instead of
        stretching the full grid column — an edge-to-edge photo read as
        oversized and left the section with no breathing room. */}
      <div className="hidden lg:mt-16 lg:grid lg:grid-cols-[0.9fr_1fr] lg:items-start lg:gap-16">
        <div className="space-y-5">
          {SHOWCASE_FEATURES.map((feature, i) => (
            <button
              key={feature.title}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-pressed={activeIndex === i}
              className={`flex min-h-[168px] w-full cursor-pointer flex-col justify-center rounded-[1.75rem] px-8 py-8 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                activeIndex === i ? 'bg-emerald-950 shadow-xl' : 'hover:bg-white hover:shadow-md'
              }`}
            >
              <span
                className={`font-serif text-xs font-bold tracking-widest transition-colors duration-500 ${
                  activeIndex === i ? 'text-amber-400' : 'text-stone-400'
                }`}
              >
                0{i + 1}
              </span>
              <h4
                className={`mt-3 font-serif text-lg font-bold transition-colors duration-500 sm:text-xl ${
                  activeIndex === i ? 'text-white' : 'text-emerald-950'
                }`}
              >
                {feature.title}
              </h4>
              <p
                className={`mt-2.5 text-sm leading-relaxed transition-colors duration-500 ${
                  activeIndex === i ? 'text-emerald-100/80' : 'text-stone-500'
                }`}
              >
                {feature.description}
              </p>
            </button>
          ))}
        </div>

        <div className="sticky top-28 ml-auto w-full max-w-md self-start">
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-stone-200/70 bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 shadow-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl"
            />

            {SHOWCASE_FEATURES.map((feature, i) => (
              <Image
                key={feature.image}
                src={feature.image}
                alt={feature.imageAlt}
                fill
                sizes="(min-width: 1024px) 420px, 0px"
                className={`transition-opacity duration-700 ease-out ${
                  feature.fit === 'contain' ? 'object-contain p-8' : 'object-cover'
                } ${activeIndex === i ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}

            {SHOWCASE_FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl border border-stone-100 bg-white/95 p-3 shadow-lg backdrop-blur-md transition-opacity duration-500 ${
                  activeIndex === i ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  {feature.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base font-extrabold leading-none text-emerald-950">
                    {feature.statValue}
                  </p>
                  <p className="mt-1 truncate text-[11px] font-semibold text-stone-500">
                    {feature.statLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile — stacked cards, each with its own square photo, no observer */}
      <div className="mt-12 grid gap-6 lg:hidden">
        {SHOWCASE_FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delayMs={i * 100}>
            <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50/50">
                <Image
                  src={feature.image}
                  alt={feature.imageAlt}
                  fill
                  sizes="(min-width: 640px) 480px, 100vw"
                  className={feature.fit === 'contain' ? 'object-contain p-8' : 'object-cover'}
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-stone-100 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md">
                  <span className="text-emerald-800">{feature.icon}</span>
                  <span className="text-xs font-bold text-emerald-950">{feature.statValue}</span>
                  <span className="text-[10px] text-stone-500">{feature.statLabel}</span>
                </div>
              </div>
              <div className="p-6">
                <span className="font-serif text-xs font-bold tracking-widest text-amber-600">
                  0{i + 1}
                </span>
                <h4 className="mt-1 font-serif text-lg font-bold text-emerald-950">
                  {feature.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
              </div>
            </div>
          </Reveal>
        ))}
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
  { href: '#comment-ca-marche', label: 'Comment ça marche' },
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#communaute', label: 'Communauté' },
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
      {/* Page-level structured data. Site-level WebSite/Organization lives
          in layout.tsx (a server component — this one is 'use client', where
          Next strips non-public env vars, so absolute URLs built from
          APP_URL would serialise as localhost here).

          SoftwareApplication describes the product; note that Google only
          renders a software rich result when aggregateRating or review is
          present, and inventing either is a policy violation — so this block
          earns its keep as an entity description for Google's Knowledge
          Graph and for AI answer engines, not as a SERP widget.
          FAQPage mirrors the visible accordion (same FAQ_ITEMS array); FAQ
          rich results have been limited to government and health sites since
          2023, so it is likewise there for the answer engines. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Goshen Finance',
              applicationCategory: 'FinanceApplication',
              applicationSubCategory: 'Gestion financière pour églises',
              // Stays 'Web': the app is installable as a PWA on Android and
              // iOS, but listing those here would read as native apps that
              // do not exist.
              operatingSystem: 'Web',
              inLanguage: 'fr',
              description:
                'Gestion financière transparente et multi-annexes pour les églises : dîmes, offrandes, dépenses avec reçus et rapports PDF.',
              featureList: [
                'Saisie des dîmes et offrandes du culte',
                'Dépenses avec justificatifs photo',
                'Gestion multi-annexes consolidée',
                'Rapports et bilans PDF en 1 clic',
                'Utilisation hors connexion',
              ],
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'XOF',
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

      {/* <main> landmark: gives crawlers and assistive tech an explicit
          "this is the page content" boundary distinct from the nav and the
          footer chrome repeated on every route. */}
      <main>
        {/* Hero Section — short bold headline with one highlighted word,
          plain-language description, a single short CTA, and the official
          mockup artwork floating on a continuous gentle bob so the hero
          feels alive before the visitor scrolls. No eyebrow badge or stats
          strip — kept deliberately minimal so the mockup and headline carry
          the section. Light background throughout — nav blends straight
          into the hero instead of sitting on a separate dark band. */}
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

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
            {/* Wide ambient glow spanning both columns' lower half, so the
              CTA row and the photo read as one continuous, filled zone
              instead of the CTA sitting isolated above empty space. */}
            <div
              aria-hidden
              className="animate-float pointer-events-none absolute -z-10 bottom-[-15%] left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-100/60 via-amber-50/30 to-transparent blur-3xl sm:h-64 lg:h-72"
            />

            {/* Left: pitch */}
            <div className="relative z-10 text-center lg:text-left">
              <Reveal immediate>
                <h1 className="font-serif text-4xl font-extrabold leading-[1.15] tracking-tight text-stone-900 sm:text-5xl lg:text-[3.4rem]">
                  La trésorerie
                  <br />
                  de votre église.
                  <br />
                  Enfin{' '}
                  <span className="relative inline-block">
                    <span className="shimmer-text">simple.</span>
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
                        className="animate-draw-underline"
                      />
                    </svg>
                  </span>
                </h1>
              </Reveal>

              <Reveal immediate delayMs={80}>
                <p className="mx-auto mt-4 font-serif text-base italic text-emerald-700 sm:text-lg lg:mx-0">
                  Du culte au bilan, sans un seul calcul à la main.
                </p>
              </Reveal>

              <Reveal immediate delayMs={100}>
                <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-stone-600 sm:text-lg lg:mx-0">
                  Enregistrez les dîmes, les offrandes et les dépenses depuis votre téléphone, même
                  sans connexion. Goshen organise et calcule — vous retrouvez des comptes clairs en
                  quelques minutes.
                </p>
              </Reveal>

              <Reveal immediate delayMs={200}>
                <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row lg:justify-start">
                  <Link
                    href="/signup"
                    className="w-full transform rounded-full bg-emerald-800 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 sm:w-auto"
                  >
                    Commencer gratuitement &rarr;
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

              <Reveal immediate delayMs={300}>
                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-stone-500 lg:justify-start">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Gratuit pour toujours &bull; Sans carte bancaire &bull; Prêt en 2 minutes
                </p>
              </Reveal>
            </div>

            {/* Right: two different visuals by breakpoint (art direction —
              next/image has no native per-breakpoint source, so this is two
              <Image> elements toggled with display classes; only one
              carries `preload` so the head never preloads both). Mobile
              shows a real person presenting the app (warmer, more
              immediately legible at small size), its lower edge dissolved
              via mask so it doesn't sit in a visible box; desktop shows the
              product-only dual-phone mockup, already cleanly transparent on
              every edge with no mask needed. Both float continuously so the
              section feels alive. */}
            <Reveal immediate delayMs={150} className="relative flex justify-center lg:justify-end">
              {/* Mobile-only glow sitting behind the photo — softens its
                silhouette against the page background and, combined with
                the mask below, keeps the scroll into the next section from
                reading as a hard rectangular cut. */}
              <div
                aria-hidden
                className="animate-float pointer-events-none absolute -z-10 -bottom-6 left-1/2 h-56 w-[115%] -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-100/70 via-amber-50/40 to-transparent blur-3xl lg:hidden"
              />

              {/* Mobile — LCP element for the majority of visitors (this
                app targets phones on 3G first), so this is the one with
                `preload`. Its own bottom fifth dissolves via mask-image
                instead of ending on the photo's hard edge (where the
                subject is cropped), so it blends into the glow above and
                the section below instead of sitting in a visible box. */}
              <Image
                src="/photos/hero-mockup-mobile.png"
                alt="Une utilisatrice de Goshen présentant le tableau de bord de son église sur son téléphone"
                width={1254}
                height={1254}
                sizes="(min-width: 640px) 480px, 85vw"
                className="animate-float relative z-10 block h-auto w-full max-w-sm drop-shadow-2xl sm:max-w-md lg:hidden"
                style={{
                  WebkitMaskImage:
                    'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
                }}
                preload
              />
              {/* Desktop — the ~1.7 MB source PNG is served as a resized
                AVIF/WebP; `sizes` matches its actual rendered width so
                desktop visitors don't fetch more than needed. */}
              <Image
                src="/photos/hero-mockup.png"
                alt="Aperçu du tableau de bord Goshen sur smartphone : solde de trésorerie, entrées et sorties du culte, et les actions rapides de saisie"
                width={1536}
                height={1024}
                sizes="820px"
                className="animate-float relative z-10 hidden h-auto w-full drop-shadow-2xl lg:block lg:max-w-3xl"
              />
            </Reveal>

            {/* Full-width close — a soft colour continuation across the
              whole section width, sitting in the row's own bottom padding
              (top-full, no upward overlap) so it can never wash out the CTA
              or the trust line in the text column. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full z-20 h-16 bg-gradient-to-b from-transparent via-[#fafaf7]/70 to-[#fafaf7] blur-2xl sm:h-20 lg:h-24"
            />
          </div>
        </section>

        {/* Problem Section — 3 concrete pains (time / trust / proof), each
          card revealing on scroll with a staggered delay so the section
          feels sequenced rather than dumped on the visitor all at once. */}
        <section
          id="probleme"
          className="relative overflow-hidden bg-gradient-to-b from-rose-50/50 via-white to-white py-20 px-6"
        >
          <div className="relative mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center max-w-3xl mx-auto">
                <span className="inline-block rounded-full bg-rose-50 px-3.5 py-1 text-xs font-semibold text-rose-800 mb-3 border border-rose-100">
                  Le vrai coût du cahier papier
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
                  Le dimanche devrait se terminer après le culte. Pas après les comptes.
                </h2>
                <p className="mt-4 text-stone-600 text-base leading-relaxed">
                  Après le culte, les fidèles rentrent chez eux. Le trésorier, lui, reste encore à
                  compter, recompter, vérifier les reçus et chercher pourquoi le solde ne correspond
                  pas.
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid md:grid-cols-3 gap-8">
              <Reveal delayMs={0}>
                <PainCard
                  icon={<CalendarClockIcon className="h-6 w-6" />}
                  title="Des heures perdues"
                  description="À recompter la même corbeille, plusieurs fois."
                />
              </Reveal>
              <Reveal delayMs={150}>
                <PainCard
                  icon={<AlertTriangleIcon className="h-6 w-6" />}
                  title="Des écarts difficiles à expliquer"
                  description="Un chiffre qui ne correspond jamais tout à fait."
                />
              </Reveal>
              <Reveal delayMs={300}>
                <PainCard
                  icon={<ReceiptTextIcon className="h-6 w-6" />}
                  title="Des justificatifs introuvables"
                  description="La dépense du mois dernier, notée où, déjà ?"
                />
              </Reveal>
            </div>

            <Reveal delayMs={400}>
              <div className="mt-10 flex justify-center">
                <a
                  href="#comment-ca-marche"
                  className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  Goshen change cette routine
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
                          Vous enregistrez
                        </h3>
                        <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                          Le culte, une dépense, un justificatif photo — depuis le smartphone du
                          trésorier, même sans connexion.
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
                          Goshen organise
                        </h3>
                        <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                          Classement automatique de chaque entrée et dépense, calcul du solde en
                          continu.
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
                          Vous obtenez votre bilan
                        </h3>
                        <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                          Rapport PDF prêt en quelques minutes, transmis au pasteur et au comité
                          sans délai.
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
                Du culte au bilan. <span className="text-emerald-700">Tout est déjà organisé.</span>
              </h2>

              <p className="mt-5 text-stone-600 text-base sm:text-lg leading-relaxed font-light">
                Vous enregistrez une entrée, une dépense, un justificatif. Goshen classe, additionne
                et met à jour votre solde — vous n’avez plus rien à recalculer à la main.
              </p>

              <p className="mt-3 font-serif text-lg font-bold text-emerald-800">
                Vous enregistrez. Goshen organise et calcule.
              </p>

              {/* Key Metrics / Stats */}
              <div className="mt-10 grid grid-cols-3 gap-6 pt-8 border-t border-stone-200">
                <div className="transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                    2 min
                  </p>
                  <p className="text-xs text-stone-500 mt-1 font-medium">
                    Saisie moyenne d'un culte
                  </p>
                </div>
                <div className="transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                    100%
                  </p>
                  <p className="text-xs text-stone-500 mt-1 font-medium">Dépenses avec reçus</p>
                </div>
                <div className="transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-3xl sm:text-4xl font-serif font-extrabold text-emerald-800">
                    0
                  </p>
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

          {/* Demo video — the proof behind "Voir comment ça marche" in the
            hero, placed here rather than its own section so it reads as
            evidence for these 3 steps instead of a separate detour. */}
          <Reveal delayMs={200}>
            <div className="relative mx-auto mt-16 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                Voir Goshen en 2 minutes
              </p>
              <div className="group relative mt-5 overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
                <video
                  controls
                  preload="metadata"
                  poster="/photos/dashboard-preview.png"
                  className="aspect-video w-full"
                >
                  <source src="/videos/presentation-goshen.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Fonctionnalités clés — consolidates what used to be two separate
          sections (Sécurité, Multi-Annexes) into one, per the copy pass:
          the multi-annexes showcase (real screenshot) leads as the richest
          proof, then an interactive photo showcase (FeatureShowcase) covers
          offline, roles and export/audit without repeating a whole section
          for each. */}
        <section
          id="fonctionnalites"
          className="bg-gradient-to-b from-white to-stone-50 py-20 px-6"
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center max-w-3xl mx-auto">
                <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-3 border border-emerald-100">
                  Conçu pour le terrain
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
                  Tout ce dont votre trésorerie a besoin, là où vous êtes
                </h2>
              </div>
            </Reveal>

            {/* Multi-annexes showcase */}
            <div className="mt-14 grid md:grid-cols-2 gap-12 items-center">
              <Reveal>
                <div>
                  <span className="inline-block rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 mb-4">
                    Supervision de Réseau
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                    Plusieurs annexes. Une seule vision.
                  </h3>
                  <p className="mt-4 text-stone-600 text-base leading-relaxed">
                    Chaque annexe garde sa caisse, son historique, son trésorier, ses opérations. Le
                    siège, lui, garde une <strong>vision consolidée</strong> de l’ensemble.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-stone-700">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-700 font-bold">✓</span> Soldes indépendants pour
                      chaque lieu de culte
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-700 font-bold">✓</span> Alerte automatique si le
                      solde d’une annexe descend sous le seuil que vous avez fixé
                    </li>
                  </ul>
                  <p className="mt-4 font-serif text-base font-bold text-emerald-800">
                    Chaque église garde son autonomie. Vous gardez la visibilité.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg"
                  >
                    Ajouter mes annexes &rarr;
                  </Link>
                </div>
              </Reveal>

              <Reveal delayMs={150}>
                <div className="rounded-3xl border border-stone-300/80 bg-emerald-950 p-2 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
                  <Image
                    src="/photos/goshen-desktop.jpg"
                    alt="Vue consolidée des annexes de l'église affichée sur le tableau de bord Goshen"
                    width={1536}
                    height={1024}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="w-full h-auto rounded-2xl"
                  />
                </div>
              </Reveal>
            </div>

            {/* Interactive feature showcase — offline, roles, export/audit */}
            <FeatureShowcase />

            <Reveal delayMs={50}>
              <p className="mx-auto mt-16 flex max-w-lg items-center justify-center gap-2 text-center font-serif text-lg font-bold text-emerald-950">
                <DownloadIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                Vos données vous appartiennent — rien n’est verrouillé.
              </p>
            </Reveal>

            <Reveal delayMs={100}>
              <div className="mt-8 flex justify-center">
                <a
                  href="#communaute"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg"
                >
                  Découvrir notre communauté &rarr;
                </a>
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
                    <p className="font-serif text-lg sm:text-xl text-stone-700">Une question ?</p>
                    <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-950 tracking-tight leading-tight">
                      Vous n’êtes <span className="text-emerald-800">pas seul.</span>
                    </h2>
                    <p className="max-w-md pt-2 text-base leading-relaxed text-stone-600">
                      Notre équipe vous accompagne en français, notamment via WhatsApp, lorsque vous
                      en avez besoin.
                    </p>
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
                    <Image
                      src="/photos/goshen-app.jpg"
                      alt="Membre de la communauté Goshen utilisant l'application pendant le culte"
                      width={1200}
                      height={1200}
                      sizes="(min-width: 640px) 448px, 384px"
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
                {/* next/image: these four are `hidden` below lg, but a raw
                  <img> is fetched by the browser even inside a
                  display:none parent — every phone visitor was paying for
                  a collage it never sees. next/image lazy-loads by default,
                  and `sizes` pins each one to its rendered width. */}
                <Image
                  src="/photos/photo-5.jpg"
                  alt="Membre de la communauté Goshen à l'église"
                  width={735}
                  height={919}
                  sizes="160px"
                  className="absolute left-6 top-0 h-40 w-40 -rotate-6 rounded-2xl border-4 border-white object-cover shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
                />
                <Image
                  src="/photos/goshen-community.jpg"
                  alt="Équipe de trésoriers d'église utilisant Goshen"
                  width={900}
                  height={600}
                  sizes="176px"
                  className="absolute right-0 top-4 h-52 w-44 rotate-3 rounded-2xl border-4 border-white object-cover shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
                />
                <Image
                  src="/photos/goshen-family.jpg"
                  alt="Comité paroissial en réunion avec Goshen"
                  width={900}
                  height={450}
                  sizes="288px"
                  className="absolute left-16 top-44 z-10 h-64 w-72 -rotate-2 rounded-2xl border-4 border-white object-cover shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
                />
                <Image
                  src="/photos/photo-2.jpg"
                  alt="Collecte de la corbeille pendant le culte"
                  width={735}
                  height={490}
                  sizes="144px"
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
      </main>

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
                  <a href="#comment-ca-marche" className="hover:text-white transition-colors">
                    Comment ça marche
                  </a>
                </li>
                <li>
                  <a href="#fonctionnalites" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#probleme" className="hover:text-white transition-colors">
                    Pourquoi Goshen
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
                {/* /soutenir was reachable only from inside the app (header,
                    dashboard, settings), so no crawler could ever discover
                    it — an orphan page cannot be indexed. */}
                <li>
                  <Link href="/soutenir" className="hover:text-white transition-colors">
                    Soutenir Goshen
                  </Link>
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
                <li>
                  <a
                    href={`tel:${SUPPORT_PHONE_E164}`}
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <PhoneIcon className="h-3.5 w-3.5 text-emerald-400" />
                    {SUPPORT_PHONE_DISPLAY}
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
