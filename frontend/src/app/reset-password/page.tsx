'use client';

import { useState, type FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import { CheckCircleIcon, ShieldCheckIcon } from '@/components/icons/ChurchIcons';
import { PasswordInput } from '@/components/ui/PasswordInput';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ csrfToken?: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim(), newPassword },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la réinitialisation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-800/10 via-stone-50 to-stone-950/15 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── SPLIT-CARD BIFOLD CONTAINER — matches /login, /signup and
          /forgot-password so the whole recovery flow reads as one product. ── */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col md:flex-row min-h-[560px]">
        {/* Compact mobile-only header (brand panel below is desktop-only) */}
        <div className="flex md:hidden items-center justify-between px-5 py-4 border-b border-stone-100">
          <Link href="/">
            <GoshenWordmark markClassName="h-6 w-6" wordmarkClassName="text-lg" />
          </Link>
          <Link href="/login" className="text-xs font-bold text-emerald-800">
            Connexion
          </Link>
        </div>

        {/* ── LEFT VOLET: GOSHEN BRAND & LAST-STEP REASSURANCE (desktop only) ── */}
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
              <CheckCircleIcon className="h-3.5 w-3.5" />
              <span>Dernière étape</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Un nouveau départ pour votre trésorerie.
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed font-normal">
              Entrez le code reçu par email et choisissez un mot de passe robuste pour retrouver
              l’accès à votre tableau de bord.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-emerald-800/80">
            <p className="text-xs text-emerald-200/90 mb-3">Le code n’est jamais arrivé ?</p>
            <Link
              href="/forgot-password"
              className="inline-block w-full text-center rounded-xl border border-emerald-400/50 hover:border-white bg-emerald-950/40 hover:bg-white hover:text-emerald-950 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
            >
              Redemander un code &rarr;
            </Link>
          </div>
        </div>

        {/* ── RIGHT VOLET: RESET FORM ── */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:w-7/12 bg-white">
          <div>
            <div className="mb-6">
              <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Dernière étape
              </h1>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                Nouveau mot de passe
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Entrez le code reçu et définissez votre nouveau mot de passe.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Adresse email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Code reçu (8 caractères)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ABC12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-stone-200 p-3 text-center text-base font-mono font-bold tracking-widest text-emerald-950 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nouveau mot de passe (10+ caractères)
                </label>
                <PasswordInput
                  required
                  minLength={10}
                  autoComplete="new-password"
                  placeholder="10+ caractères"
                  value={newPassword}
                  onChange={setNewPassword}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
              >
                {submitting ? 'Modification…' : 'Mettre à jour et se connecter →'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-stone-800/10 via-stone-50 to-stone-950/15 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
