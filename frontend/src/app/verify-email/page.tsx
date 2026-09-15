'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      router.push('/onboarding');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || 'Code de vérification invalide ou expiré.'
          : 'Erreur réseau. Veuillez réessayer.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900 text-white font-serif font-bold text-2xl shadow-sm">
            G
          </div>
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-emerald-950">
          Vérification de l’email
        </h1>
        <p className="mt-1 text-xs text-stone-600">
          Entrez le code à 8 caractères reçu par email pour valider votre compte.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl sm:px-10 border border-stone-200">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-sm text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Code de validation (8 caractères) *
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Ex: ABC12345"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-center text-lg font-mono font-bold tracking-widest text-emerald-950 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || code.length < 4}
              className="w-full rounded-lg bg-emerald-800 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Vérification…' : 'Valider mon compte &rarr;'}
            </button>
          </form>
        </div>
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

