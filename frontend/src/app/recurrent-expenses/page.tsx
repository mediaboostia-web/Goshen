'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { CheckCircleIcon, LightningBoltIcon } from '@/components/icons/ChurchIcons';
import { Select } from '@/components/ui/Select';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface RecurrentModel {
  id: string;
  name: string;
  amount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  dueDay: number;
  status: 'ACTIVE' | 'PAUSED';
  category: { name: string };
  branch: { name: string };
}

export default function RecurrentExpensesPage() {
  const { church, branches, currentBranch, isConsolidated } = useBranch();
  const { toast } = useToast();
  const canManage = church ? church.isPastor || church.isTreasurer : true;

  const [models, setModels] = useState<RecurrentModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [dueDay, setDueDay] = useState<number>(28);
  const [categoryId, setCategoryId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  useEffect(() => {
    if (currentBranch) {
      setBranchId(currentBranch.id);
    } else if (branches.length > 0) {
      const first = branches[0];
      if (first) setBranchId(first.id);
    }
  }, [currentBranch, branches]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeBranchParam = isConsolidated ? 'CONSOLIDATED' : currentBranch?.id;
      const [recRes, catsRes] = await Promise.all([
        api<{ models: RecurrentModel[] }>(`/api/recurrent-expenses?branchId=${activeBranchParam}`),
        api<{ categories: Category[] }>('/api/church/categories'),
      ]);

      setModels(recRes.models || []);
      const expCats = (catsRes.categories || []).filter((c) => c.type === 'EXPENSE');
      setCategories(expCats);
      const firstCat = expCats[0];
      if (firstCat && !categoryId) {
        setCategoryId(firstCat.id);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [isConsolidated, currentBranch, categoryId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateModel(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10);

    if (!name.trim()) {
      setError('Veuillez saisir un nom pour ce modèle récurrent.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Veuillez saisir un montant supérieur à 0 FCFA.');
      return;
    }
    if (!branchId) {
      setError('Choisissez une annexe précise dans l’en-tête avant de créer un modèle.');
      return;
    }
    if (!categoryId) {
      setError('Veuillez choisir une catégorie.');
      return;
    }

    setSubmitting(true);
    try {
      await api('/api/recurrent-expenses', {
        method: 'POST',
        body: {
          name: name.trim(),
          amount: parsedAmount,
          frequency,
          dueDay: Number(dueDay),
          branchId,
          categoryId,
        },
      });

      toast(`Modèle "${name}" créé avec succès !`, 'success');
      setShowAddModal(false);
      setName('');
      setAmount('');
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erreur lors de la création du modèle.');
      } else {
        setError('Erreur de communication avec le serveur.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      {/* Modal to add a new model */}
      {showAddModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl p-6 shadow-xl border border-stone-200">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100 gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Créer un modèle de dépense récurrente
                </h3>
                <p className="text-[11px] font-medium text-stone-400 truncate">
                  {isConsolidated ? 'Choisir une annexe dans l’en-tête' : currentBranch?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="shrink-0 text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateModel} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Intitulé de la dépense récurrente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cotisation Caisse Nationale ADD, Loyer, Salaire Gardien..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Montant fixe (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    placeholder="50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-stone-900 font-bold shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Périodicité *</label>
                  <Select
                    aria-label="Périodicité"
                    options={[
                      { value: 'MONTHLY', label: 'Mensuelle' },
                      { value: 'WEEKLY', label: 'Hebdomadaire' },
                    ]}
                    value={frequency}
                    onChange={(v) => setFrequency(v as 'MONTHLY' | 'WEEKLY')}
                  />
                </div>
              </div>

              {/* No annexe/branch field here on purpose — the model is
                  created for whichever annexe is active in the header
                  switcher. */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {frequency === 'MONTHLY'
                    ? 'Jour du mois (ex: 28)'
                    : 'Jour de semaine (0=Dimanche)'}
                </label>
                <input
                  type="number"
                  min={frequency === 'MONTHLY' ? 1 : 0}
                  max={frequency === 'MONTHLY' ? 31 : 6}
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Catégorie comptable *</label>
                <Select
                  aria-label="Catégorie comptable"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Choisir une catégorie"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? 'Création…' : 'Enregistrer le modèle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
              Modèles de Dépenses Récurrentes
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Configurez vos charges fixes (cotisations, loyer, salaires) pour ne plus jamais rien
              oublier.
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <Link
                href="/recurrent-expenses/validation"
                className="rounded-xl bg-stone-900 hover:bg-stone-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                <span>Valider les échéances</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-xl bg-emerald-800 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                + Nouveau modèle
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-12 text-center text-xs text-stone-500">Chargement des modèles…</p>
        ) : models.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
              <LightningBoltIcon className="h-6 w-6 text-emerald-800" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
              Aucun modèle de dépense récurrente
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto">
              {canManage
                ? 'Créez vos modèles habituels (ex: Cotisation caisse nationale ADD de 50 000 FCFA le 28 de chaque mois) pour recevoir des rappels automatiques.'
                : 'Aucun modèle configuré pour le moment.'}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-5 rounded-xl bg-emerald-800 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                Créer un modèle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                      {m.frequency === 'MONTHLY' ? 'MENSUEL' : 'HEBDOMADAIRE'} &bull; Jour{' '}
                      {m.dueDay}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {m.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-bold text-stone-900">{m.name}</h3>
                  <p className="font-mono tabular-nums text-2xl font-bold text-emerald-950 mt-1">
                    {m.amount.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-sans font-normal text-stone-500">FCFA</span>
                  </p>
                  <p className="mt-3 text-xs text-stone-500">
                    Catégorie :{' '}
                    <span className="font-medium text-stone-700">{m.category.name}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    Annexe : <span className="font-medium text-stone-700">{m.branch.name}</span>
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                  <span className="text-stone-400 text-[11px]">Rappel auto activé</span>
                  <Link
                    href="/recurrent-expenses/validation"
                    className="font-bold text-emerald-800 hover:text-emerald-950"
                  >
                    Voir échéances &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
