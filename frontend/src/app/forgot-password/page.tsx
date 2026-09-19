'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import { LockIcon, ShieldCheckIcon } from '@/components/icons/ChurchIcons';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-800/10 via-stone-50 to-stone-950/15 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── SPLIT-CARD BIFOLD CONTAINER — matches /login and /signup so the
          whole auth flow reads as one product, instead of this screen
          being a plain, unbranded fallback. ── */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col md:flex-row min-h-[520px]">
        {/* Compact mobile-only header (brand panel below is desktop-only) */}
        <div className="flex md:hidden items-center justify-between px-5 py-4 border-b border-stone-100">
          <Link href="/">
            <GoshenWordmark markClassName="h-6 w-6" wordmarkClassName="text-lg" />
          </Link>
          <Link href="/login" className="text-xs font-bold text-emerald-800">
            Connexion
          </Link>
        </div>

        {/* ── LEFT VOLET: GOSHEN BRAND & RECOVERY REASSURANCE (desktop only) ── */}
        <div className="hidden md:flex relative flex-col justify-between bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 p-8 sm:p-10 text-white md:w-5/12">
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border border-emerald-500/10 pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border border-emerald-500/10 pointer-events-none" />

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

          <div className="relative z-10 my-8 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/60 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-700/60">
              <LockIcon className="h-3.5 w-3.5" />
              <span>Récupération sécurisée</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Retrouvez l’accès à votre trésorerie.
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed font-normal">
              Un code de vérification vous est envoyé par email pour réinitialiser votre mot de
              passe en toute sécurité, sans jamais exposer vos données de caisse.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-emerald-800/80">
            <p className="text-xs text-emerald-200/90 mb-3">
              Vous vous souvenez de votre mot de passe ?
            </p>
            <Link
              href="/login"
              className="inline-block w-full text-center rounded-xl border border-emerald-400/50 hover:border-white bg-emerald-950/40 hover:bg-white hover:text-emerald-950 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
            >
              Se connecter &rarr;
            </Link>
          </div>
        </div>

        {/* ── RIGHT VOLET: RESET REQUEST FORM ── */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:w-7/12 bg-white">
          <div>
            <div className="mb-6">
              <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Récupération de compte
              </h1>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                Mot de passe oublié
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Recevez un code par email pour réinitialiser votre accès.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Adresse email associée
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer le code de réinitialisation'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-100 text-center text-xs">
              <Link href="/login" className="font-bold text-emerald-800 hover:underline">
                &larr; Retour à la connexion
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-center text-[11px] text-stone-500 md:justify-start">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700" />
              Code à usage unique, valable quelques minutes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
