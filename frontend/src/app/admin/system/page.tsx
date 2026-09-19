'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type TabKey = 'email-queue' | 'outbox' | 'rate-limits';

interface EmailJobRow {
  id: string;
  to: string;
  subject: string;
  bodyPreview: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

interface OutboxRow {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

interface RateLimitBucket {
  bucket: string;
  totalKeys: number;
  top10: { key: string; hits: number; expiresAt: string | null }[];
  truncated?: boolean;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'email-queue', label: 'File d’emails' },
  { key: 'outbox', label: 'Outbox' },
  { key: 'rate-limits', label: 'Limites de débit' },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800',
  DEAD: 'bg-stone-200 text-stone-700',
};

export default function AdminSystemPage() {
  const [tab, setTab] = useState<TabKey>('email-queue');
  const [emailJobs, setEmailJobs] = useState<EmailJobRow[]>([]);
  const [outboxRows, setOutboxRows] = useState<OutboxRow[]>([]);
  const [buckets, setBuckets] = useState<RateLimitBucket[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        if (tab === 'email-queue') {
          const res = await api<{ items: EmailJobRow[] }>('/api/admin/email-queue?limit=50');
          setEmailJobs(res.items);
        } else if (tab === 'outbox') {
          const res = await api<{ items: OutboxRow[] }>('/api/admin/outbox?limit=50');
          setOutboxRows(res.items);
        } else {
          const res = await api<{ buckets: RateLimitBucket[]; note?: string }>(
            '/api/admin/rate-limits',
          );
          setBuckets(res.buckets);
          setNote(res.note || null);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    })();
  }, [tab]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <h1 className="font-serif text-2xl font-bold text-stone-900">Système</h1>

      <div className="flex gap-2 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      {loading && <p className="text-xs text-stone-400">Chargement…</p>}

      {!loading && tab === 'email-queue' && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Destinataire</th>
                <th className="px-4">Sujet</th>
                <th className="px-4">Statut</th>
                <th className="px-4">Tentatives</th>
                <th className="px-4">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {emailJobs.map((j) => (
                <tr key={j.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="py-3 px-4 text-stone-900">{j.to}</td>
                  <td className="px-4 text-stone-600 truncate max-w-xs">{j.subject}</td>
                  <td className="px-4">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[j.status] || 'bg-stone-100 text-stone-700'}`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 text-stone-500">{j.attempts}</td>
                  <td className="px-4 text-stone-500">
                    {new Date(j.createdAt).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {emailJobs.length === 0 && (
            <p className="py-8 text-center text-xs text-stone-400">File d’emails vide.</p>
          )}
        </div>
      )}

      {!loading && tab === 'outbox' && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Type</th>
                <th className="px-4">Statut</th>
                <th className="px-4">Tentatives</th>
                <th className="px-4">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {outboxRows.map((o) => (
                <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-stone-900">{o.kind}</td>
                  <td className="px-4">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status] || 'bg-stone-100 text-stone-700'}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 text-stone-500">{o.attempts}</td>
                  <td className="px-4 text-stone-500">
                    {new Date(o.createdAt).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {outboxRows.length === 0 && (
            <p className="py-8 text-center text-xs text-stone-400">Outbox vide.</p>
          )}
        </div>
      )}

      {!loading && tab === 'rate-limits' && (
        <div className="space-y-4">
          {note && <p className="text-xs text-amber-700">{note}</p>}
          {buckets.map((b) => (
            <div
              key={b.bucket}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-stone-900 font-mono">{b.bucket}</h3>
                <span className="text-[11px] text-stone-500">
                  {b.totalKeys} clé{b.totalKeys > 1 ? 's' : ''}
                  {b.truncated ? ' (tronqué)' : ''}
                </span>
              </div>
              <ul className="space-y-1">
                {b.top10.map((entry) => (
                  <li key={entry.key} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-stone-600 truncate">{entry.key}</span>
                    <span className="text-stone-500 shrink-0 ml-2">{entry.hits} hits</span>
                  </li>
                ))}
                {b.top10.length === 0 && <li className="text-[11px] text-stone-400">Vide.</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
