'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';

interface MemberItem {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    status: string;
  };
  branchAccess: { branch: { id: string; name: string } }[];
}

export default function MembersPage() {
  const { branches } = useBranch();
  const { toast } = useToast();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isPastor, setIsPastor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviting, setInviting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Invite states
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<'TREASURER' | 'SECRETARY' | 'AUDITOR' | 'PASTOR'>('TREASURER');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ members: MemberItem[]; isPastor: boolean }>('/api/church/members');
      setMembers(res.members || []);
      setIsPastor(res.isPastor);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email requis.');
      return;
    }

    setInviting(true);
    try {
      await api('/api/church/members', {
        method: 'POST',
        body: {
          email: email.trim(),
          name: name.trim() || undefined,
          role,
          branchIds: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        },
      });

      toast(`Invitation envoyée à ${email} !`, 'success');
      setShowInviteModal(false);
      setEmail('');
      setName('');
      setSelectedBranchIds([]);
      await loadMembers();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erreur lors de l’invitation.');
      } else {
        setError('Erreur réseau.');
      }
    } finally {
      setInviting(false);
    }
  }

  function toggleBranch(id: string) {
    if (selectedBranchIds.includes(id)) {
      setSelectedBranchIds(selectedBranchIds.filter((b) => b !== id));
    } else {
      setSelectedBranchIds([...selectedBranchIds, id]);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl border border-stone-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Inviter un membre d’équipe
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Adresse email *</label>
                <input
                  type="email"
                  required
                  placeholder="tresorier@eglise.ga"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nom et Prénom</label>
                <input
                  type="text"
                  placeholder="Ex: Sœur Christelle Mboulou"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Rôle attribué *</label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'TREASURER' | 'SECRETARY' | 'AUDITOR' | 'PASTOR')
                  }
                  className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                >
                  <option value="TREASURER">Trésorier (Saisie entrées/dépenses, validation)</option>
                  <option value="AUDITOR">Auditeur (Contrôle lecture seule & justificatifs)</option>
                  <option value="SECRETARY">Secrétaire (Consultation & comptes rendus)</option>
                  <option value="PASTOR">Pasteur Adjoint (Gestion complète)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Accès aux Annexes (Optionnel - Par défaut toutes)
                </label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-stone-200 rounded-lg p-2 bg-stone-50">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={() => toggleBranch(b.id)}
                        className="rounded text-emerald-700"
                      />
                      <span className="text-stone-700">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-stone-300 px-3.5 py-2 text-stone-700 hover:bg-stone-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {inviting ? 'Envoi…' : 'Envoyer l’invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
              Gestion des Membres & Permissions
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Attribuez les rôles précis (Trésorier, Secrétaire, Auditeur) pour sécuriser l’accès
              aux finances.
            </p>
          </div>

          {isPastor && (
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              + Inviter un membre
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-12 text-center text-xs text-stone-500">Chargement des membres…</p>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Membre</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Annexes assignées</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-stone-900 block">
                        {m.user.name || 'Membre d’équipe'}
                      </span>
                      <span className="text-[11px] text-stone-500">{m.user.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          m.role === 'PASTOR'
                            ? 'bg-amber-100 text-amber-900'
                            : m.role === 'TREASURER'
                              ? 'bg-emerald-100 text-emerald-900'
                              : m.role === 'AUDITOR'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {m.role === 'PASTOR'
                          ? 'Pasteur'
                          : m.role === 'TREASURER'
                            ? 'Trésorier'
                            : m.role === 'AUDITOR'
                              ? 'Auditeur'
                              : 'Secrétaire'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {m.branchAccess.length > 0
                        ? m.branchAccess.map((ba) => ba.branch.name).join(', ')
                        : 'Toutes les annexes'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[11px] font-semibold text-emerald-700">Actif</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
