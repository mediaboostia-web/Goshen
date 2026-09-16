'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { GoshenLogo } from '@/components/icons/GoshenLogo';

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
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center bg-stone-800 text-emerald-500">
            <GoshenLogo className="h-7 w-7" />
          </div>
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-emerald-950">
          Mot de passe oublié
        </h1>
        <p className="mt-1 text-xs text-stone-600">
          Recevez un code par email pour réinitialiser votre accès.
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
                Adresse email associée
              </label>
              <input
                type="email"
                required
                placeholder="pasteur@eglise.ga"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-sm text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-800 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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
      </div>
    </div>
  );
}
