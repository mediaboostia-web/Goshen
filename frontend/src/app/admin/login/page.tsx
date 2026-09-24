'use client';

// Dedicated superadmin/admin sign-in. Kept separate from the public
// /login page (which always redirects to /dashboard on success) because
// an operator's browser commonly already holds a valid session cookie for
// an unrelated regular-user account — landing on the generic login page
// after being bounced from /admin gives no indication that's what
// happened. This page redirects into /admin instead of /dashboard on
// success, and surfaces the 403 case (valid session, wrong role) inline
// rather than silently sending the operator back into the regular app.

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { ShieldCheckIcon } from '@/components/icons/ChurchIcons';
import { GoshenLogo } from '@/components/icons/GoshenLogo';
import { PasswordInput } from '@/components/ui/PasswordInput';

const REASON_MESSAGES: Record<string, string> = {
  forbidden: 'Ce compte est connecté mais n’a pas les droits administrateur.',
  unauthenticated: 'Veuillez vous connecter avec un compte administrateur.',
};

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    reason ? (REASON_MESSAGES[reason] ?? null) : null,
  );
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

      try {
        await api('/api/admin/me');
        router.push('/admin');
      } catch (meErr) {
        if (meErr instanceof ApiError && meErr.status === 403) {
          setError('Ce compte n’a pas les droits administrateur.');
        } else {
          setError('Impossible de vérifier les droits administrateur.');
        }
      }
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-6">
          <GoshenLogo className="h-6 w-6 shrink-0" style={{ color: '#0F172A' }} />
          <span className="font-serif text-base font-extrabold text-stone-900">Administration</span>
        </div>

        <h1 className="font-serif text-xl font-bold text-stone-950">Connexion administrateur</h1>
        <p className="text-xs text-stone-500 mt-1 mb-6">
          Réservé aux comptes ADMIN et SUPERADMIN de la plateforme.
        </p>

        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200">
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
              placeholder="admin@goshen.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">Mot de passe</label>
            <PasswordInput
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={setPassword}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-stone-900 py-3 text-xs font-bold text-white shadow-md hover:bg-stone-800 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700" />
            Accès audité
          </span>
          <Link href="/login" className="font-semibold text-stone-600 hover:text-stone-900">
            Connexion standard →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-stone-50 text-xs text-stone-500 font-sans">
          Chargement…
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
