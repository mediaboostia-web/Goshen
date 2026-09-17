'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { Select } from '@/components/ui/Select';

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function ChurchSettingsPage() {
  const { church } = useBranch();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ categories: Category[] }>('/api/church/categories');
      setCategories(res.categories || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newCatName.trim()) return;

    setAdding(true);
    try {
      await api('/api/church/categories', {
        method: 'POST',
        body: {
          name: newCatName.trim(),
          type: newCatType,
        },
      });

      toast(`Catégorie "${newCatName}" ajoutée !`, 'success');
      setNewCatName('');
      await loadCategories();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erreur lors de l’ajout.');
      } else {
        setError('Erreur réseau.');
      }
    } finally {
      setAdding(false);
    }
  }

  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Paramètres & Catégories de l’Église
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Personnalisez vos rubriques de culte et consultez les informations de {church?.name}.
          </p>
        </div>

        {/* General Church Info */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs text-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
            Identité de la Communauté
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-stone-400 block">Nom de l’Église</span>
              <span className="font-bold text-stone-900 text-sm">{church?.name}</span>
            </div>
            <div>
              <span className="text-stone-400 block">Dénomination</span>
              <span className="font-bold text-stone-900 text-sm">
                {church?.denomination || 'Non spécifié'}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block">Devise par défaut</span>
              <span className="font-bold text-emerald-800 text-sm">
                {church?.currency || 'FCFA'}
              </span>
            </div>
          </div>
        </div>

        {/* Categories Manager */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-4">
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Catégories Financières Personnalisées
              </h2>
              <p className="text-xs text-stone-500">
                Gérez les motifs d’entrées (dîmes, collectes) et de dépenses de votre assemblée.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Add Category Form — Pastor & Treasurer, mirrors the backend gate */}
          {(church?.isPastor || church?.isTreasurer) && (
            <form
              onSubmit={handleAddCategory}
              className="flex flex-wrap items-center gap-3 text-xs"
            >
              <input
                type="text"
                required
                placeholder="Ex: Don spécial évangélisation, Sono..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 min-w-[200px] rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
              />
              <Select
                aria-label="Type de catégorie"
                className="w-56"
                value={newCatType}
                onChange={(v) => setNewCatType(v as 'INCOME' | 'EXPENSE')}
                options={[
                  { value: 'INCOME', label: 'Type : ENTRÉE (Dîmes, Offrandes)' },
                  { value: 'EXPENSE', label: 'Type : DÉPENSE (Sorties)' },
                ]}
              />
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {adding ? 'Ajout…' : 'Ajouter'}
              </button>
            </form>
          )}

          {/* Categories Lists Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
            {/* Income Categories */}
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
              <h3 className="font-bold text-emerald-950 pb-2 border-b border-stone-200 mb-3 flex items-center justify-between">
                <span>💰 Catégories d’Entrées</span>
                <span className="text-[11px] text-stone-500">{incomeCats.length}</span>
              </h3>
              <div className="space-y-1.5">
                {incomeCats.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex justify-between items-center py-1 px-2 bg-white rounded-md border border-stone-100"
                  >
                    <span className="font-medium text-stone-800">{cat.name}</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Entrée</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
              <h3 className="font-bold text-stone-900 pb-2 border-b border-stone-200 mb-3 flex items-center justify-between">
                <span>🧾 Catégories de Dépenses</span>
                <span className="text-[11px] text-stone-500">{expenseCats.length}</span>
              </h3>
              <div className="space-y-1.5">
                {expenseCats.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex justify-between items-center py-1 px-2 bg-white rounded-md border border-stone-100"
                  >
                    <span className="font-medium text-stone-800">{cat.name}</span>
                    <span className="text-[10px] text-stone-500 font-bold">Dépense</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
