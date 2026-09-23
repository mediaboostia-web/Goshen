'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ChurchIcon, GoogleIcon, ShieldCheckIcon } from '@/components/icons/ChurchIcons';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import { ChurchIdentityFields } from '@/components/onboarding/ChurchIdentityFields';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function SignupPage() {
  const router = useRouter();
  const [churchName, setChurchName] = useState('');
  const [denomination, setDenomination] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Church-identity fields ride along as URL query params from this
  // unauthenticated screen through /verify-email to /onboarding — there is
  // no session yet to persist them server-side against, and this mirrors
  // the app's only existing cross-screen state pattern (signup already
  // passes ?email= the same way, and OAuth passes ?next=).
  function churchParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (churchName.trim()) params.set('churchName', churchName.trim());
    if (denomination.trim()) params.set('denomination', denomination.trim());
    if (country) params.set('country', country);
    if (city.trim()) params.set('city', city.trim());
    return params;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setSubmitting(true);
    try {
      // Signup never sets cookies (enumeration-resistant — identical
      // response whether the email is new or already registered). The
      // session is issued by /verify-email once the 8-char code is entered.
      await api('/api/auth/signup', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      const params = churchParams();
      params.set('email', email.trim());
      router.push(`/verify-email?${params.toString()}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || 'Impossible de créer le compte pour le moment.'
          : 'Erreur réseau. Veuillez réessayer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Google skips signup+verify-email entirely (the OAuth email is already
  // verified) and lands straight on /onboarding — so whatever was already
  // typed here needs to ride along on `next=` too, or it's lost.
  const googleNext = (() => {
    const params = churchParams();
    const qs = params.toString();
    return qs ? `/onboarding?${qs}` : '/onboarding';
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-800/10 via-stone-50 to-stone-950/15 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── SPLIT-CARD BIFOLD CONTAINER ── */}
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col md:flex-row md:min-h-[580px]">
        {/* Compact mobile-only header — the full brand panel below is desktop-only so the form stays the only thing on screen on a phone (no scroll) */}
        <div className="flex md:hidden items-center justify-between px-5 py-4 border-b border-stone-100">
          <Link href="/">
            <GoshenWordmark markClassName="h-6 w-6" wordmarkClassName="text-lg" />
          </Link>
          <Link href="/login" className="text-xs font-bold text-emerald-800">
            Se connecter
          </Link>
        </div>

        {/* ── LEFT VOLET: GOSHEN IDENTITY & MISSION (desktop only) ── */}
        <div className="hidden md:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 p-8 sm:p-10 text-white md:w-5/12">
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border border-emerald-500/10 pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border border-emerald-500/10 pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <Link href="/">
              <GoshenWordmark
                variant="creme"
                tagline="GESTION FINANCIÈRE ECCLÉSIALE"
                markClassName="h-8 w-8"
                wordmarkClassName="text-2xl"
              />
            </Link>
          </div>

          {/* Center Message */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/60 px-3 py-1 text-[11px] font-semibold text-amber-300 border border-emerald-700/60">
              <ChurchIcon className="h-3.5 w-3.5" />
              <span>Adhésion Libre & Gratuite</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Bâtissons une trésorerie sainte.
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed font-normal">
              Rejoignez les pasteurs, trésoriers et auditeurs qui simplifient la gestion des cultes
              dominicaux, des offrandes et des charges fixes.
            </p>
          </div>

          {/* Bottom Switcher Link */}
          <div className="relative z-10 pt-4 border-t border-emerald-800/80">
            <p className="text-xs text-emerald-200/90 mb-3">
              Vous avez déjà un compte responsable ?
            </p>
            <Link
              href="/login"
              className="inline-block w-full text-center rounded-xl border border-emerald-400/50 hover:border-white bg-emerald-950/40 hover:bg-white hover:text-emerald-950 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
            >
              Se connecter &rarr;
            </Link>
          </div>
        </div>

        {/* ── RIGHT VOLET: SIGNUP FORM ── */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:w-7/12 bg-white">
          <div>
            {/* Header */}
            <div className="mb-6">
              {/* Eyebrow label, not the heading — see login/page.tsx. */}
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Création de Compte
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                Inscrire votre Église
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                Démarrez en moins de 2 minutes pour configurer votre première paroisse
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* Church Identity + Email/Password Signup Form */}
            <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
              <ChurchIdentityFields
                churchName={churchName}
                onChurchNameChange={setChurchName}
                denomination={denomination}
                onDenominationChange={setDenomination}
                country={country}
                onCountryChange={setCountry}
                city={city}
                onCityChange={setCity}
              />

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Adresse email du pasteur ou trésorier
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="pasteur@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mot de passe</label>
                  <PasswordInput
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 car."
                    value={password}
                    onChange={setPassword}
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Confirmer mot de passe
                  </label>
                  <PasswordInput
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Répétez"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />
                </div>
              </div>

              <p className="text-[11px] text-stone-500 pt-1 leading-relaxed">
                En créant un compte, vous acceptez la charte de confidentialité et de gestion
                financière ecclésiastique de Goshen.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
              >
                {submitting ? 'Création en cours…' : 'Créer mon compte'}
              </button>
            </form>

            {/* Separator */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-center">
                <span className="bg-white px-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                  Ou
                </span>
              </div>
            </div>

            {/* LE SEUL MOYEN RAPIDE EST AVEC GOOGLE */}
            <div>
              <a
                href={`/api/auth/oauth/google/start?next=${encodeURIComponent(googleNext)}`}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 py-2.5 px-4 text-xs font-bold text-stone-700 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>Continuer avec Google</span>
              </a>
            </div>
          </div>

          {/* Footer reassurance */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700" />
              Données protégées et confidentielles
            </span>
            <span className="font-semibold text-emerald-800">Sans carte bancaire requise</span>
          </div>
        </div>
      </div>
    </div>
  );
}
