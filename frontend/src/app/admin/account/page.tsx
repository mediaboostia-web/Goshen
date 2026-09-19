'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

// api() already retries a 401 once after a silent token refresh (see
// lib/api.ts). If it still throws 401 here, both the access AND refresh
// cookies are gone/invalid — no amount of client-side retry fixes that.
// Surface a clear French message instead of the raw server error code
// ("Missing token" / "Invalid or expired token") and send them to
// /admin/login rather than leaving a dead form on screen.
function describeError(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) {
    return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  }
  return err instanceof ApiError ? err.message || 'Erreur inconnue.' : 'Erreur réseau.';
}

interface Me {
  email: string;
  hasPassword: boolean;
  linkedProviders: string[];
}

interface SuperadminRow {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export default function AdminAccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [viewerIsSuperadmin, setViewerIsSuperadmin] = useState(false);
  const [superadmins, setSuperadmins] = useState<SuperadminRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  async function loadMe() {
    try {
      const res = await api<{ user: Me }>('/api/auth/me');
      setMe(res.user);
    } catch {
      setMe(null);
    }
  }

  async function loadSuperadmins() {
    try {
      const res = await api<{ items: SuperadminRow[] }>(
        '/api/admin/users?role=SUPERADMIN&limit=50',
      );
      setSuperadmins(res.items);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Erreur de chargement.');
    }
  }

  useEffect(() => {
    void loadMe();
    void loadSuperadmins();
    // POST /api/admin/superadmins is SUPERADMIN-only server-side — an ADMIN
    // viewer must see the list read-only, not a form that would 403 on
    // submit (mirrors the same gate added to admin/users/page.tsx).
    void (async () => {
      try {
        const res = await api<{ admin: { role: 'ADMIN' | 'SUPERADMIN' } }>('/api/admin/me');
        setViewerIsSuperadmin(res.admin.role === 'SUPERADMIN');
      } catch {
        setViewerIsSuperadmin(false);
      }
    })();
  }, []);

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPwSubmitting(true);
    try {
      if (me?.hasPassword) {
        await api('/api/auth/change-password', {
          method: 'PUT',
          body: { currentPassword, newPassword },
        });
      } else {
        await api('/api/auth/set-password', {
          method: 'POST',
          body: { newPassword },
        });
      }
      setPwSuccess(
        me?.hasPassword
          ? 'Mot de passe mis à jour. Vos autres sessions ont été déconnectées.'
          : 'Mot de passe créé. Vous pouvez maintenant vous connecter avec email + mot de passe sur /admin/login.',
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadMe();
    } catch (err) {
      setPwError(describeError(err));
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/admin/login?reason=unauthenticated');
      }
    } finally {
      setPwSubmitting(false);
    }
  }

  async function onAddSuperadmin(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    setAddSubmitting(true);
    try {
      const res = await api<{ user: SuperadminRow }>('/api/admin/superadmins', {
        method: 'POST',
        body: { email: newEmail.trim(), ...(newName.trim() ? { name: newName.trim() } : {}) },
      });
      setSuperadmins((prev) => [res.user, ...prev]);
      setAddSuccess(
        `${res.user.email} est maintenant SUPERADMIN — un email avec les instructions de connexion vient d'être envoyé.`,
      );
      setNewEmail('');
      setNewName('');
    } catch (err) {
      setAddError(describeError(err));
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/admin/login?reason=unauthenticated');
      }
    } finally {
      setAddSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h1 className="font-serif text-2xl font-bold text-stone-900">Mon compte</h1>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900 mb-1">
          {me?.hasPassword ? 'Changer le mot de passe' : 'Créer un mot de passe'}
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          {me
            ? me.hasPassword
              ? `Connecté en tant que ${me.email}. Un mot de passe est déjà défini pour ce compte.`
              : `Connecté en tant que ${me.email} via ${me.linkedProviders.join(', ') || 'Google'} uniquement — aucun mot de passe n'est encore défini.`
            : 'Chargement…'}
        </p>

        {pwError && (
          <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            {pwSuccess}
          </div>
        )}

        <form onSubmit={onPasswordSubmit} className="space-y-3 text-xs">
          {me?.hasPassword && (
            <div>
              <label className="block font-bold text-stone-700 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 p-3 text-xs shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>
          )}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-200 p-3 text-xs shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-200 p-3 text-xs shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={pwSubmitting || !me}
            className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition-all cursor-pointer"
          >
            {pwSubmitting ? 'Envoi…' : me?.hasPassword ? 'Mettre à jour' : 'Créer le mot de passe'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900 mb-1">Super-administrateurs</h2>
        <p className="text-xs text-stone-500 mb-4">
          Accès SUPERADMIN complet à la plateforme. À réserver aux personnes de confiance.
        </p>

        {listError && (
          <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {listError}
          </div>
        )}

        <ul className="divide-y divide-stone-100 mb-5">
          {superadmins.map((s) => (
            <li key={s.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-stone-900">{s.name || s.email}</p>
                <p className="text-stone-500">{s.email}</p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  s.status === 'SUSPENDED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {s.status === 'SUSPENDED' ? 'Suspendu' : 'SUPERADMIN'}
              </span>
            </li>
          ))}
          {superadmins.length === 0 && !listError && (
            <li className="py-2.5 text-xs text-stone-400">Chargement…</li>
          )}
        </ul>

        {addError && (
          <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {addError}
          </div>
        )}
        {addSuccess && (
          <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            {addSuccess}
          </div>
        )}

        {viewerIsSuperadmin ? (
          <form onSubmit={onAddSuperadmin} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder="email@exemple.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 p-2.5 text-xs shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
            />
            <input
              type="text"
              placeholder="Nom (optionnel)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 p-2.5 text-xs shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={addSubmitting}
              className="rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
            >
              {addSubmitting ? 'Ajout…' : '+ Ajouter un superadmin'}
            </button>
          </form>
        ) : (
          <p className="text-xs text-stone-400">
            Seul un SUPERADMIN peut accorder ce rôle à un nouveau compte.
          </p>
        )}
      </section>
    </div>
  );
}
