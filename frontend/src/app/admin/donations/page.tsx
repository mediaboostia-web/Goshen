'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminDonation {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
  amount: number;
  currency: string;
  donorEmail: string | null;
  donorName: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ListResponse {
  items: AdminDonation[];
  nextCursor: string | null;
  totalCollected: number;
  totalCompletedCount: number;
}

function fcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

const STATUS_LABEL: Record<AdminDonation['status'], string> = {
  PENDING: 'En attente',
  COMPLETED: 'Complété',
  FAILED: 'Échoué',
  ABANDONED: 'Abandonné',
};

const STATUS_STYLE: Record<AdminDonation['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800',
  ABANDONED: 'bg-stone-100 text-stone-600',
};

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [status, setStatus] = useState('');
  const [totals, setTotals] = useState<{ totalCollected: number; totalCompletedCount: number }>({
    totalCollected: 0,
    totalCompletedCount: 0,
  });
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(reset: boolean) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (!reset && cursor) params.set('cursor', cursor);
      params.set('limit', '50');
      const res = await api<ListResponse>(`/api/admin/donations?${params.toString()}`);
      setDonations((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
      setTotals({
        totalCollected: res.totalCollected,
        totalCompletedCount: res.totalCompletedCount,
      });
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
        <h1 className="font-serif text-2xl font-bold text-stone-900">Dons</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden self-start"
        >
          <option value="">Tous statuts</option>
          <option value="PENDING">En attente</option>
          <option value="COMPLETED">Complété</option>
          <option value="FAILED">Échoué</option>
          <option value="ABANDONED">Abandonné</option>
        </select>
      </header>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Total collecté
          </p>
          <p className="mt-1 font-serif text-xl font-bold text-emerald-800">
            {fcfa(totals.totalCollected)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Dons complétés
          </p>
          <p className="mt-1 font-serif text-xl font-bold text-stone-900">
            {totals.totalCompletedCount}
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
              <th className="py-3 px-4">Donateur</th>
              <th className="px-4">Montant</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Créé le</th>
              <th className="px-4">Complété le</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="py-3 px-4">
                  <p className="font-semibold text-stone-900">{d.donorName || 'Anonyme'}</p>
                  <p className="text-stone-400">{d.donorEmail || '—'}</p>
                </td>
                <td className="px-4 font-bold text-rose-700">{fcfa(d.amount)}</td>
                <td className="px-4">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[d.status]}`}
                  >
                    {STATUS_LABEL[d.status]}
                  </span>
                </td>
                <td className="px-4 text-stone-500">
                  {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 text-stone-500">
                  {d.completedAt ? new Date(d.completedAt).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && donations.length === 0 && (
          <p className="py-8 text-center text-xs text-stone-400">Aucun don trouvé.</p>
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
