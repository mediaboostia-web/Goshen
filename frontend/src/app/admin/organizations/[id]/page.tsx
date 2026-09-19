'use client';

import { useEffect, useState, use as usePromise, type FormEvent } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface OrgDetail {
  id: string;
  slug: string;
  name: string;
  denomination: string | null;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  owner: { id: string; email: string; name: string | null };
  branches: { id: string; name: string; city: string | null; isMain: boolean; status: string }[];
  members: {
    id: string;
    role: string;
    user: { id: string; email: string; name: string | null; status: string };
  }[];
}

interface DetailResponse {
  organization: OrgDetail;
  last30Days: {
    transactionCount: number;
    byType: { type: string; total: number }[];
  };
}

type MemberRole = 'PASTOR' | 'TREASURER' | 'SECRETARY' | 'AUDITOR';
const ROLE_OPTIONS: MemberRole[] = ['PASTOR', 'TREASURER', 'SECRETARY', 'AUDITOR'];
const ROLE_LABEL: Record<MemberRole, string> = {
  PASTOR: 'Pasteur',
  TREASURER: 'Trésorier',
  SECRETARY: 'Secrétaire',
  AUDITOR: 'Commissaire',
};

function fcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export default function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('TREASURER');
  const [addingMember, setAddingMember] = useState(false);

  async function load() {
    try {
      const res = await api<DetailResponse>(`/api/admin/organizations/${id}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement.');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function toggleStatus() {
    if (!data) return;
    setBusy(true);
    try {
      const nextStatus = data.organization.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      await api(`/api/admin/organizations/${id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
      setConfirmOpen(false);
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la mise à jour.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(memberId: string, role: MemberRole) {
    setMemberError(null);
    setSavingMemberId(memberId);
    try {
      await api(`/api/admin/organizations/${id}/members/${memberId}`, {
        method: 'PATCH',
        body: { role },
      });
      await load();
    } catch (err) {
      setMemberError(err instanceof ApiError ? err.message : 'Échec du changement de rôle.');
    } finally {
      setSavingMemberId(null);
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    setRemoveBusy(true);
    try {
      await api(`/api/admin/organizations/${id}/members/${removeTarget.id}`, {
        method: 'DELETE',
      });
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setMemberError(err instanceof ApiError ? err.message : 'Échec du retrait.');
    } finally {
      setRemoveBusy(false);
    }
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setMemberError(null);
    if (!newEmail.trim()) {
      setMemberError('Email requis.');
      return;
    }
    setAddingMember(true);
    try {
      await api(`/api/admin/organizations/${id}/members`, {
        method: 'POST',
        body: { email: newEmail.trim(), name: newName.trim() || undefined, role: newRole },
      });
      setNewEmail('');
      setNewName('');
      setNewRole('TREASURER');
      await load();
    } catch (err) {
      setMemberError(err instanceof ApiError ? err.message : 'Échec de l’ajout du membre.');
    } finally {
      setAddingMember(false);
    }
  }

  if (error) {
    return (
      <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 max-w-lg">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-xs text-stone-400">Chargement…</p>;
  }

  const org = data.organization;
  const isSuspended = org.status === 'SUSPENDED';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link href="/admin/organizations" className="text-xs font-semibold text-stone-500">
          ← Églises
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">{org.name}</h1>
            <p className="text-xs text-stone-500">
              {org.slug} · {org.denomination || 'Dénomination non renseignée'}
            </p>
          </div>
          <span
            className={`self-start rounded-md px-3 py-1 text-xs font-bold ${
              isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isSuspended ? 'Suspendue' : 'Active'}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 uppercase">
            Pasteur / Propriétaire
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {org.owner.name || org.owner.email}
          </p>
          <p className="text-xs text-stone-500">{org.owner.email}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 uppercase">
            Transactions (30 jours)
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {data.last30Days.transactionCount}
          </p>
          {data.last30Days.byType.map((t) => (
            <p key={t.type} className="text-xs text-stone-500">
              {t.type === 'INCOME' ? 'Entrées' : 'Dépenses'}: {fcfa(t.total)}
            </p>
          ))}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 uppercase">Créée le</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {new Date(org.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
          Actions administratives
        </h2>
        {!isSuspended && (
          <input
            type="text"
            placeholder="Motif (optionnel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-hidden"
          />
        )}
        <div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors ${
              isSuspended ? 'bg-emerald-800 hover:bg-emerald-700' : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            {isSuspended ? 'Réactiver l’église' : 'Suspendre l’église'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
          Annexes ({org.branches.length})
        </h2>
        <ul className="space-y-1.5">
          {org.branches.map((b) => (
            <li key={b.id} className="text-xs text-stone-700 flex items-center justify-between">
              <span>
                {b.name} {b.isMain && <span className="text-emerald-600">(principale)</span>}
              </span>
              <span className="text-stone-400">{b.city || '—'}</span>
            </li>
          ))}
          {org.branches.length === 0 && <li className="text-xs text-stone-400">Aucune annexe.</li>}
        </ul>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
          Membres ({org.members.length})
        </h2>

        {memberError && (
          <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
            {memberError}
          </p>
        )}

        <div className="rounded-xl border border-stone-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-2.5 px-3">Membre</th>
                <th className="px-3">Compte</th>
                <th className="px-3">Rôle</th>
                <th className="px-3" />
              </tr>
            </thead>
            <tbody>
              {org.members.map((m) => {
                const isOwner = m.user.id === org.owner.id;
                return (
                  <tr key={m.id} className="border-b border-stone-50">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-stone-900">{m.user.name || m.user.email}</p>
                      <p className="text-stone-400">{m.user.email}</p>
                    </td>
                    <td className="px-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          m.user.status === 'SUSPENDED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {m.user.status === 'SUSPENDED' ? 'Suspendu' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-3">
                      <select
                        value={m.role}
                        disabled={savingMemberId === m.id}
                        onChange={(e) => void handleRoleChange(m.id, e.target.value as MemberRole)}
                        className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs focus:border-emerald-600 focus:outline-hidden disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 text-right">
                      {isOwner ? (
                        <span className="text-[11px] text-stone-400">Propriétaire</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setRemoveTarget({ id: m.id, label: m.user.name || m.user.email })
                          }
                          className="text-[11px] font-semibold text-rose-700 hover:underline"
                        >
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {org.members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-stone-400">
                    Aucun membre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={(e) => void handleAddMember(e)} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="membre@exemple.com"
              className="w-56 rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Nom (optionnel)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-40 rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Rôle</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as MemberRole)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={addingMember}
            className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {addingMember ? 'Ajout…' : '+ Ajouter'}
          </button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={isSuspended ? 'Réactiver cette église ?' : 'Suspendre cette église ?'}
        description={
          isSuspended
            ? 'Le pasteur et son équipe retrouveront immédiatement l’accès au tableau de bord.'
            : 'L’église perdra immédiatement l’accès à son tableau de bord et à toutes les routes de l’API, jusqu’à réactivation.'
        }
        confirmLabel={isSuspended ? 'Réactiver' : 'Suspendre'}
        destructive={!isSuspended}
        busy={busy}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!removeTarget}
        title={`Retirer ${removeTarget?.label ?? 'ce membre'} ?`}
        description="Cette personne perdra immédiatement l’accès à cette église."
        confirmLabel="Retirer"
        destructive
        busy={removeBusy}
        onConfirm={() => void handleRemoveMember()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
