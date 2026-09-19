'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminActionRow {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
}

interface ListResponse {
  items: AdminActionRow[];
  nextCursor: string | null;
}

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<AdminActionRow[]>([]);
  const [action, setAction] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(reset: boolean) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (!reset && cursor) params.set('cursor', cursor);
      params.set('limit', '50');
      const res = await api<ListResponse>(`/api/admin/audit-log?${params.toString()}`);
      setRows((prev) => (reset ? res.items : [...prev, ...res.items]));
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
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-stone-900">Journal d’audit</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(true);
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            placeholder="Filtrer par action (ex: organization.suspend)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-72 rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
          >
            Filtrer
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
              <th className="py-3 px-4">Action</th>
              <th className="px-4">Cible</th>
              <th className="px-4">Acteur</th>
              <th className="px-4">IP</th>
              <th className="px-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-stone-50 hover:bg-stone-50 align-top">
                <td className="py-3 px-4 font-mono font-semibold text-emerald-800">{row.action}</td>
                <td className="px-4 text-stone-600">
                  {row.targetType ? `${row.targetType} · ${row.targetId ?? '—'}` : '—'}
                </td>
                <td className="px-4 text-stone-500 font-mono">{row.actorId}</td>
                <td className="px-4 text-stone-400">{row.ip || '—'}</td>
                <td className="px-4 text-stone-500">
                  {new Date(row.createdAt).toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 && (
          <p className="py-8 text-center text-xs text-stone-400">Aucune action enregistrée.</p>
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
