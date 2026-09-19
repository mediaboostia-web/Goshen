'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

interface AdminOrganization {
  id: string;
  slug: string;
  name: string;
  denomination: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  _count: { branches: number; members: number; transactions: number };
}

interface ListResponse {
  items: AdminOrganization[];
  nextCursor: string | null;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(reset: boolean) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (!reset && cursor) params.set('cursor', cursor);
      params.set('limit', '50');
      const res = await api<ListResponse>(`/api/admin/organizations?${params.toString()}`);
      setOrgs((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, [status]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-stone-900">Églises</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(true);
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            placeholder="Rechercher par nom ou slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspendue</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
          >
            Rechercher
          </button>
        </form>
      </header>

      {error && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
              <th className="py-3 px-4">Église</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Annexes</th>
              <th className="px-4">Membres</th>
              <th className="px-4">Transactions</th>
              <th className="px-4">Créée le</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="py-3 px-4">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="font-semibold text-emerald-800 hover:underline"
                  >
                    {org.name}
                  </Link>
                  <p className="text-stone-400">{org.slug}</p>
                </td>
                <td className="px-4">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      org.status === 'SUSPENDED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {org.status === 'SUSPENDED' ? 'Suspendue' : 'Active'}
                  </span>
                </td>
                <td className="px-4 text-stone-600">{org._count.branches}</td>
                <td className="px-4 text-stone-600">{org._count.members}</td>
                <td className="px-4 text-stone-600">{org._count.transactions}</td>
                <td className="px-4 text-stone-500">
                  {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && orgs.length === 0 && (
          <p className="py-8 text-center text-xs text-stone-400">Aucune église trouvée.</p>
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
