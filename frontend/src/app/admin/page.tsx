'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

interface Stats {
  organizations: { total: number; active: number; suspended: number; activeBranches: number };
  users: { total: number; active: number; memberships: number };
  transactions: { total: number; totalIncome: number; totalExpense: number; netBalance: number };
  recurringExpenses: { active: number };
  reports: { total: number };
  donations: {
    totalCollected: number;
    completedCount: number;
    thisMonth: { amount: number; count: number };
  };
  recentUsers: { id: string; email: string; name: string | null; createdAt: string }[];
  recentDonations: {
    id: string;
    amount: number;
    donorName: string | null;
    donorEmail: string | null;
    completedAt: string | null;
  }[];
  recentOrganizations: {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: string;
  }[];
}

function fcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent?: string | undefined;
  sub?: string | undefined;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
      <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-bold ${accent || 'text-stone-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<Stats>('/api/admin/stats');
        setStats(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erreur de chargement.');
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <h1 className="font-serif text-2xl font-bold text-stone-900">Vue d’ensemble</h1>

      {error && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      {stats && (
        <>
          <div>
            <h2 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Revenu &amp; activité de la plateforme
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Dons collectés (total)"
                value={fcfa(stats.donations.totalCollected)}
                accent="text-emerald-800"
                sub={`${stats.donations.completedCount} don${stats.donations.completedCount > 1 ? 's' : ''} complété${stats.donations.completedCount > 1 ? 's' : ''}`}
              />
              <StatCard
                label="Dons ce mois-ci"
                value={fcfa(stats.donations.thisMonth.amount)}
                accent="text-emerald-800"
                sub={`${stats.donations.thisMonth.count} don${stats.donations.thisMonth.count > 1 ? 's' : ''}`}
              />
              <StatCard
                label="Églises actives"
                value={stats.organizations.active}
                sub={
                  stats.organizations.suspended > 0
                    ? `${stats.organizations.suspended} suspendue${stats.organizations.suspended > 1 ? 's' : ''} sur ${stats.organizations.total}`
                    : `sur ${stats.organizations.total} au total`
                }
              />
              <StatCard
                label="Utilisateurs actifs"
                value={stats.users.active}
                sub={`sur ${stats.users.total} au total · ${stats.users.memberships} adhésions`}
              />
            </div>
          </div>

          <div>
            <h2 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Activité comptable des églises (agrégat, informatif)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Annexes actives" value={stats.organizations.activeBranches} />
              <StatCard
                label="Transactions"
                value={stats.transactions.total}
                sub="toutes églises confondues"
              />
              <StatCard label="Charges fixes actives" value={stats.recurringExpenses.active} />
              <StatCard label="Rapports générés" value={stats.reports.total} />
              <StatCard
                label="Entrées cumulées (églises)"
                value={fcfa(stats.transactions.totalIncome)}
                accent="text-stone-700"
              />
              <StatCard
                label="Dépenses cumulées (églises)"
                value={fcfa(stats.transactions.totalExpense)}
                accent="text-stone-700"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Dernières églises
                </h2>
                <Link
                  href="/admin/organizations"
                  className="text-[11px] font-semibold text-emerald-700"
                >
                  Voir tout →
                </Link>
              </div>
              <ul className="space-y-2">
                {stats.recentOrganizations.map((o) => (
                  <li key={o.id} className="flex items-center justify-between text-xs">
                    <Link
                      href={`/admin/organizations/${o.id}`}
                      className="text-stone-700 truncate hover:text-emerald-800"
                    >
                      {o.name}
                    </Link>
                    {o.status === 'SUSPENDED' ? (
                      <span className="text-[10px] font-bold text-rose-600 shrink-0 ml-2">
                        Suspendue
                      </span>
                    ) : (
                      <span className="text-stone-400 shrink-0 ml-2">
                        {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </li>
                ))}
                {stats.recentOrganizations.length === 0 && (
                  <li className="text-xs text-stone-400">Aucune église.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Derniers inscrits
                </h2>
                <Link href="/admin/users" className="text-[11px] font-semibold text-emerald-700">
                  Voir tout →
                </Link>
              </div>
              <ul className="space-y-2">
                {stats.recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-700 truncate">{u.name || u.email}</span>
                    <span className="text-stone-400 shrink-0 ml-2">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </li>
                ))}
                {stats.recentUsers.length === 0 && (
                  <li className="text-xs text-stone-400">Aucun utilisateur.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Derniers dons
                </h2>
                <Link
                  href="/admin/donations"
                  className="text-[11px] font-semibold text-emerald-700"
                >
                  Voir tout →
                </Link>
              </div>
              <ul className="space-y-2">
                {stats.recentDonations.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-700 truncate">
                      {d.donorName || d.donorEmail || 'Anonyme'}
                    </span>
                    <span className="text-rose-700 font-bold shrink-0 ml-2">{fcfa(d.amount)}</span>
                  </li>
                ))}
                {stats.recentDonations.length === 0 && (
                  <li className="text-xs text-stone-400">Aucun don pour l’instant.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
