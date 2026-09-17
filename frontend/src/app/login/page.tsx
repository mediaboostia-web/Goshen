'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ChurchIcon, GoogleIcon, ShieldCheckIcon } from '@/components/icons/ChurchIcons';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ csrfToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || 'Identifiants invalides.'
          : 'Erreur réseau. Veuillez réessayer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-800/10 via-stone-50 to-stone-950/15 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── SPLIT-CARD BIFOLD CONTAINER ── */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col md:flex-row min-h-[560px]">
        {/* ── LEFT VOLET: GOSHEN BRAND & ECCLESIASTICAL WELCOME ── */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 p-8 sm:p-10 text-white md:w-5/12">
          {/* Subtle Decorative Backdrop Elements (No Glows/Sparkles) */}
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
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/60 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-700/60">
              <ChurchIcon className="h-3.5 w-3.5" />
              <span>Adhésion libre et gratuite</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              La Paix soit avec vous.
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed font-normal">
              Gestion financière sainte, transparente et collaborative au service du Royaume. Dîmes,
              offrandes et décaissements gérés avec fidélité.
            </p>
          </div>

          {/* Bottom Switcher Link */}
          <div className="relative z-10 pt-4 border-t border-emerald-800/80">
            <p className="text-xs text-emerald-200/90 mb-3">
              Votre communauté n&apos;a pas encore de compte ?
            </p>
            <Link
              href="/signup"
              className="inline-block w-full text-center rounded-xl border border-emerald-400/50 hover:border-white bg-emerald-950/40 hover:bg-white hover:text-emerald-950 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
            >
              Créer un compte d&apos;Église &rarr;
            </Link>
          </div>
        </div>

        {/* ── RIGHT VOLET: CLEAN AUTHENTICATION FORM ── */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:w-7/12 bg-white">
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Espace de Connexion
              </h1>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                Connexion Responsable
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Saisissez vos identifiants pour accéder aux registres de caisse
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={onSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Adresse email du responsable
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="pasteur@eglise.ga"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-stone-700">Mot de passe</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-emerald-800 hover:text-emerald-950 font-medium"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-md border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Se souvenir de moi</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
              >
                {submitting ? 'Connexion en cours…' : 'Se connecter au tableau de bord'}
              </button>
            </form>

            {/* Separator */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-center">
                <span className="bg-white px-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                  Le seul moyen rapide
                </span>
              </div>
            </div>

            {/* LE SEUL MOYEN RAPIDE EST AVEC GOOGLE */}
            <div>
              <a
                href="/api/auth/oauth/google/start?next=/dashboard"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 py-2.5 px-4 text-xs font-bold text-stone-700 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>Continuer avec Google</span>
              </a>
            </div>
          </div>

          {/* Quick Demo Accès Footer */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700" />
              Connexion sécurisée TLS 1.3
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail('demo@goshen.app');
                setPassword('GoshenDemo2026!');
              }}
              className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              Remplir compte démo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
