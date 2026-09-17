'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { GoshenWordmark } from '@/components/icons/GoshenWordmark';
import { ArrowRightIcon, ShieldCheckIcon } from '@/components/icons/ChurchIcons';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function onResend() {
    if (!email.trim()) {
      setError('Entrez votre adresse email pour recevoir un nouveau code.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      // Enumeration-resistant endpoint: always resolves ok, whether or not
      // the email is real/known/already verified — so this message is
      // shown unconditionally too, never a confirmation of anything.
      await api('/api/auth/resend-verification', {
        method: 'POST',
        body: { email: email.trim() },
      });
      toast('Un nouveau code a été envoyé si ce compte existe.', 'success');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || 'Impossible de renvoyer le code pour le moment.'
          : 'Erreur réseau. Veuillez réessayer.',
      );
    } finally {
      setResending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api<{ csrfToken?: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim() },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      await refresh();
      // Carry the church-identity fields collected at signup through to
      // the onboarding screen — same cross-screen query-param pattern used
      // to get `email` here in the first place.
      const forward = new URLSearchParams();
      for (const key of ['churchName', 'denomination', 'country', 'city']) {
        const value = searchParams.get(key);
        if (value) forward.set(key, value);
      }
      const qs = forward.toString();
      router.push(qs ? `/onboarding?${qs}` : '/onboarding');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || 'Code de vérification invalide ou expiré.'
          : 'Erreur réseau. Veuillez réessayer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center text-center">
        <Link href="/">
          <GoshenWordmark markClassName="h-7 w-7" wordmarkClassName="text-xl" />
        </Link>
        <h1 className="mt-5 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
          Confirmez votre adresse
        </h1>
        <p className="mt-1.5 text-xs text-stone-500 max-w-xs">
          Un code à 8 caractères vous a été envoyé par email. Entrez-le ci-dessous pour activer
          votre compte.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-6 sm:p-8 shadow-md rounded-2xl border border-stone-200">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Adresse email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Code de validation (8 caractères)
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="EX : ABC12345"
                autoFocus
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-stone-200 p-3.5 text-center text-lg font-mono font-bold tracking-[0.3em] text-emerald-800 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || code.trim().length < 4}
              className="w-full rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Vérification…' : 'Valider mon compte'}</span>
              {!submitting && <ArrowRightIcon className="h-3.5 w-3.5" />}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-stone-100 text-center">
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Vous ne trouvez pas l&apos;email ? Vérifiez vos courriers indésirables (spam).
            </p>
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="mt-2 text-[11px] font-bold text-emerald-800 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {resending ? 'Envoi…' : 'Renvoyer le code'}
            </button>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
          <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700" />
          Données protégées et confidentielles
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
