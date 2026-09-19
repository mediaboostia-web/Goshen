'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerifiedAt: string | null;
  createdAt: string;
}

interface ListResponse {
  items: AdminUser[];
  nextCursor: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  // Role changes are SUPERADMIN-only server-side (PATCH .../role calls
  // requireSuperadmin). A plain ADMIN viewer can reach this page (ADMIN
  // suffices for PII reads) but must see a read-only badge, not a control
  // that would just 403 on use.
  const [viewerIsSuperadmin, setViewerIsSuperadmin] = useState(false);

  async function changeRole(id: string, role: AdminUser['role']) {
    setRoleError(null);
    setRoleUpdating(id);
    try {
      await api(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message || 'Erreur inconnue' : 'Erreur réseau');
    } finally {
      setRoleUpdating(null);
    }
  }

  async function load(reset: boolean) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      if (!reset && cursor) params.set('cursor', cursor);
      params.set('limit', '50');
      const res = await api<ListResponse>(`/api/admin/users?${params.toString()}`);
      setUsers((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ admin: { role: 'ADMIN' | 'SUPERADMIN' } }>('/api/admin/me');
        setViewerIsSuperadmin(res.admin.role === 'SUPERADMIN');
      } catch {
        setViewerIsSuperadmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    void load(true);
  }, [role, status]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-stone-900">Utilisateurs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(true);
            }}
            className="flex gap-2"
          >
            <input
              type="search"
              placeholder="Rechercher email ou nom…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              Rechercher
            </button>
          </form>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tous rôles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPERADMIN">SUPERADMIN</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>
        </div>
      </header>

      {error && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      {roleError && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {roleError}
        </p>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
              <th className="py-3 px-4">Email</th>
              <th className="px-4">Nom</th>
              <th className="px-4">Rôle</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Vérifié</th>
              <th className="px-4">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="py-3 px-4 font-semibold text-stone-900">{u.email}</td>
                <td className="px-4 text-stone-600">{u.name ?? '—'}</td>
                <td className="px-4">
                  {viewerIsSuperadmin ? (
                    <select
                      value={u.role}
                      disabled={roleUpdating === u.id}
                      onChange={(e) => void changeRole(u.id, e.target.value as AdminUser['role'])}
                      className={`rounded-md border-0 px-2 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-50 ${
                        u.role === 'SUPERADMIN'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'ADMIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        u.role === 'SUPERADMIN'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'ADMIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="px-4">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      u.status === 'SUSPENDED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {u.status === 'SUSPENDED' ? 'Suspendu' : 'Actif'}
                  </span>
                </td>
                <td className="px-4 text-stone-500">{u.emailVerifiedAt ? '✓' : '—'}</td>
                <td className="px-4 text-stone-500">
                  {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <p className="py-8 text-center text-xs text-stone-400">Aucun utilisateur trouvé.</p>
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => void load(false)}
          disabled={loading}
          className="self-start rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold hover:bg-stone-50 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </div>
  );
}
