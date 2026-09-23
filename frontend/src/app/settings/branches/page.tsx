'use client';

import { useState, type FormEvent } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { getCurrencyLabel } from '@/lib/utils';

export default function BranchesPage() {
  const { church, branches, refreshBranches } = useBranch();
  const { toast } = useToast();
  const currency = getCurrencyLabel(church?.currency);
  const canManage = church ? church.isPastor : true;
  // Threshold adjustment is broader than branch creation: Pastor OR
  // Treasurer (mirrors PATCH /api/church/branches/[id]'s server-side gate) —
  // the Treasurer watches cash flow day-to-day and is the natural owner of
  // "when should this annexe's alert fire".
  const canEditThreshold = church ? church.isPastor || church.isTreasurer : true;

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [city, setCity] = useState<string>('Libreville');
  const [threshold, setThreshold] = useState<number>(25000);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(id: string, currentThreshold: number) {
    setEditError(null);
    setEditValue(currentThreshold);
    setEditingId(id);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    setEditError(null);
    try {
      await api(`/api/church/branches/${id}`, {
        method: 'PATCH',
        body: { lowBalanceThreshold: Number(editValue) || 0 },
      });
      toast('Seuil d’alerte mis à jour.', 'success');
      setEditingId(null);
      await refreshBranches();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message || 'Erreur inconnue' : 'Erreur réseau.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateBranch(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Le nom de l’annexe est requis.');
      return;
    }

    setLoading(true);
    try {
      await api('/api/church/branches', {
        method: 'POST',
        body: {
          name: name.trim(),
          city: city.trim() || undefined,
          lowBalanceThreshold: Number(threshold) || 25000,
        },
      });

      toast(`Annexe "${name}" ajoutée avec succès !`, 'success');
      setShowAddModal(false);
      setName('');
      await refreshBranches();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erreur lors de l’ajout.');
      } else {
        setError('Erreur réseau.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      {/* Add Branch Modal */}
      {showAddModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-xl border border-stone-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Ajouter une nouvelle Annexe
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleCreateBranch} className="mt-4 space-y-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nom de l’annexe *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Annexe Owendo - Akournam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Ville / Localité</label>
                <input
                  type="text"
                  placeholder="Ex: Owendo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Seuil d’alerte solde bas (en {currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 p-2 font-mono text-stone-900 focus:outline-hidden"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Une alerte sera émise dès que la caisse descendra sous ce montant.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-stone-300 px-3.5 py-2 text-stone-700 hover:bg-stone-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">Annexes</h1>
            <p className="text-xs text-stone-500 mt-1">
              Supervisez les caisses indépendantes de chaque annexe rattachée à {church?.name}.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              + Ajouter une annexe
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      b.isMain
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {b.isMain ? '⭐ ÉGLISE MÈRE' : '📍 ANNEXE'}
                  </span>
                  {b.city && <span className="text-[11px] text-stone-400">{b.city}</span>}
                </div>

                <h3 className="font-serif text-lg font-bold text-stone-900 mt-3">{b.name}</h3>

                <div className="mt-4 rounded-xl bg-stone-50 p-3 border border-stone-200">
                  <span className="text-[11px] text-stone-500">Solde actuel de caisse</span>
                  <p className="font-mono tabular-nums text-2xl font-bold text-emerald-950 mt-0.5">
                    {b.currentBalance.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-sans font-normal text-stone-600">{currency}</span>
                  </p>
                </div>

                {editingId === b.id ? (
                  <div className="mt-3">
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Seuil d’alerte ({currency})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={editValue}
                        onChange={(e) => setEditValue(Number(e.target.value))}
                        className="w-full rounded-lg border border-stone-300 p-1.5 font-mono text-xs text-stone-900 focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                    {editError && <p className="mt-1 text-[11px] text-rose-700">{editError}</p>}
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={savingEdit}
                        className="rounded-md border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(b.id)}
                        disabled={savingEdit}
                        className="rounded-md bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {savingEdit ? '…' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-stone-500 flex items-center gap-1.5">
                    Seuil d’alerte :{' '}
                    <strong className="font-mono tabular-nums text-stone-700">
                      {b.lowBalanceThreshold.toLocaleString('fr-FR')} {currency}
                    </strong>
                    {canEditThreshold && (
                      <button
                        type="button"
                        onClick={() => startEdit(b.id, b.lowBalanceThreshold)}
                        className="text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2"
                      >
                        Modifier
                      </button>
                    )}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-stone-100 text-right">
                <span className="text-[11px] text-emerald-700 font-bold">● Active</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
