'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { InvoiceModal, type InvoiceData } from '@/components/invoices/InvoiceModal';
import { DocumentReportIcon, CheckCircleIcon } from '@/components/icons/ChurchIcons';
import { Select } from '@/components/ui/Select';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface IncomeTransaction {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  category: { name: string };
  branch: { name: string };
  author: { name: string | null; email: string };
}

export default function IncomesPage() {
  const { church, branches, currentBranch, isConsolidated, refreshBranches } = useBranch();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [incomes, setIncomes] = useState<IncomeTransaction[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInvoiceData, setActiveInvoiceData] = useState<InvoiceData | null>(null);
  const [lastSavedIncome, setLastSavedIncome] = useState<{
    id: string;
    amount: number;
    categoryName: string;
    branchName: string;
    date: string;
    notes?: string;
  } | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0] ?? '');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (currentBranch) {
      setBranchId(currentBranch.id);
    } else if (branches.length > 0) {
      const firstBranch = branches[0];
      if (firstBranch) setBranchId(firstBranch.id);
    }
  }, [currentBranch, branches]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeBranchParam = isConsolidated ? 'CONSOLIDATED' : currentBranch?.id;
      const [catsRes, txRes] = await Promise.all([
        api<{ categories: Category[] }>('/api/church/categories'),
        api<{
          transactions: IncomeTransaction[];
          summary: { totalIncome: number };
        }>(`/api/transactions?type=INCOME&branchId=${activeBranchParam}&limit=50`),
      ]);

      const incomeCats = (catsRes.categories || []).filter((c) => c.type === 'INCOME');
      setCategories(incomeCats);
      const firstCat = incomeCats[0];
      if (firstCat && !categoryId) {
        setCategoryId(firstCat.id);
      }

      setIncomes(txRes.transactions || []);
      setTotalIncome(txRes.summary?.totalIncome || 0);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [isConsolidated, currentBranch, categoryId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAddIncome(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10);

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0 FCFA.');
      return;
    }
    if (!branchId) {
      setError('Choisissez une annexe précise dans l’en-tête avant de saisir une entrée.');
      return;
    }
    if (!categoryId) {
      setError('Veuillez sélectionner une catégorie.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const selectedBr = branches.find((b) => b.id === branchId);

      const createdTx = await api<{ transaction?: { id: string } }>('/api/transactions', {
        method: 'POST',
        body: {
          branchId,
          type: 'INCOME',
          amount: parsedAmount,
          categoryId,
          date: new Date(date).toISOString(),
          notes: notes.trim() || undefined,
        },
      });

      const savedTxInfo = {
        id: createdTx?.transaction?.id || `REC-${Date.now().toString().slice(-6)}`,
        amount: parsedAmount,
        categoryName: selectedCat?.name || 'Offrande de culte',
        branchName: selectedBr?.name || currentBranch?.name || 'Paroisse Locale',
        date,
        notes: notes.trim(),
      };
      setLastSavedIncome(savedTxInfo);

      toast(`Entrée de ${parsedAmount.toLocaleString('fr-FR')} FCFA enregistrée !`, 'success');
      setAmount('');
      setNotes('');
      await loadData();
      await refreshBranches();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erreur lors de l’enregistrement');
      } else {
        setError('Erreur de communication avec le serveur.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Open invoice modal for a specific entry
  const openIncomeInvoice = (tx: {
    id: string;
    amount: number;
    categoryName: string;
    branchName: string;
    date: string;
    notes?: string | null;
  }) => {
    setActiveInvoiceData({
      transactionId: tx.id,
      invoiceNumber: `REC-${String(tx.id).slice(0, 8).toUpperCase()}`,
      date: new Date(tx.date).toLocaleDateString('fr-FR'),
      churchName: church?.name || 'COMMUNAUTÉ ÉVANGÉLIQUE DE LA GRÂCE',
      churchDenomination: 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: `${tx.branchName}, Libreville, Gabon`,
      recipientName: 'Culte Dominical & Assemblée Locale',
      recipientAddress: 'Libreville, République Gabonaise',
      recipientContact: 'finance@eglise.ga',
      items: [
        {
          no: '01',
          description: tx.categoryName,
          subDescription: tx.notes || 'Collecte et offrandes enregistrées au grand livre',
          price: tx.amount,
          qty: '1',
          total: tx.amount,
        },
      ],
      subTotal: tx.amount,
      tax: 0,
      discount: 0,
      grandTotal: tx.amount,
      paymentMethod: 'Caisse Locale Espèces / Airtel Money',
      terms: 'Récépissé officiel de culte certifié conforme aux registres paroissiaux.',
      signatoryName: 'Diacre Trésorier de Caisse',
      signatoryRole: 'Comptabilité Paroissiale',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-stone-900 pb-24 md:pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Enregistrement des Entrées & Culte
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Saisie rapide des dîmes, offrandes et libéralités avec prévisualisation immédiate de la
            facture ou du reçu
          </p>
        </div>

        {/* Immediate Print/Download Prompt for the last recorded entry */}
        {lastSavedIncome && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Entrée de {lastSavedIncome.amount.toLocaleString('fr-FR')} FCFA enregistrée avec
                  succès !
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  {lastSavedIncome.categoryName} • {lastSavedIncome.branchName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openIncomeInvoice(lastSavedIncome)}
                className="rounded-xl bg-[#e11d48] hover:bg-[#be123c] px-4 py-2 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <DocumentReportIcon className="h-4 w-4" />
                <span>Imprimer / Télécharger Facture-Reçu</span>
              </button>
              <button
                type="button"
                onClick={() => setLastSavedIncome(null)}
                className="text-emerald-800 hover:text-emerald-950 font-bold px-2 py-1 text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card (1 col) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs h-fit">
            <h2 className="font-serif text-lg font-bold text-stone-900 pb-3 mb-4 flex items-center justify-between gap-2 border-b border-stone-100">
              <span>Nouvelle Entrée</span>
              <span className="text-[11px] font-medium text-stone-400 truncate">
                {isConsolidated ? 'Choisir une annexe ↑' : currentBranch?.name}
              </span>
            </h2>

            {!church?.isTreasurer && !church?.isPastor ? (
              <p className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-500">
                Accès en lecture seule : seuls le trésorier et le pasteur peuvent saisir une entrée.
              </p>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleAddIncome} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Montant collecté (en FCFA) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="100"
                        step="100"
                        required
                        placeholder="Ex: 85000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-base font-mono font-bold text-emerald-950 shadow-2xs focus:border-emerald-700 focus:outline-hidden pr-14"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center font-bold text-stone-400">
                        FCFA
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Catégorie de collecte *
                    </label>
                    <Select
                      aria-label="Catégorie de collecte"
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      value={categoryId}
                      onChange={setCategoryId}
                      placeholder="Choisir une catégorie"
                    />
                  </div>

                  {/* No annexe/branch field here on purpose — the entry is
                  recorded against whichever annexe is active in the header
                  switcher (BranchContext.currentBranch); re-asking it on
                  every single entry was pure friction for a church that is
                  autonomous by default. */}

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Date du culte</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Commentaire / Précision (Facultatif)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Culte de sainte cène, appel don pour le toit..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-emerald-800 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Enregistrement…' : 'Valider l’entrée'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Table Card (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2 mb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Historique des Entrées
                </h2>
                <p className="text-xs text-stone-500">
                  Total cumulé affiché :{' '}
                  <span className="font-mono tabular-nums font-bold text-emerald-800">
                    +{totalIncome.toLocaleString('fr-FR')} FCFA
                  </span>
                </p>
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-xs text-stone-500">Chargement des entrées…</p>
            ) : incomes.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                <p>Aucune entrée enregistrée pour la sélection.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 font-medium">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Catégorie</th>
                      <th className="pb-2">Annexe</th>
                      <th className="pb-2 text-right">Montant</th>
                      <th className="pb-2 text-right">Auteur</th>
                      <th className="pb-2 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {incomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 text-stone-600">
                          {new Date(inc.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-stone-900">{inc.category.name}</span>
                          {inc.notes && (
                            <span className="block text-[11px] text-stone-500 truncate max-w-xs">
                              {inc.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-stone-600 font-medium">{inc.branch.name}</td>
                        <td className="py-3 text-right font-mono tabular-nums font-bold text-emerald-800">
                          +{inc.amount.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="py-3 text-right text-stone-500 text-[11px]">
                          {inc.author.name || inc.author.email.split('@')[0]}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              openIncomeInvoice({
                                id: inc.id,
                                amount: inc.amount,
                                categoryName: inc.category.name,
                                branchName: inc.branch.name,
                                date: inc.date,
                                notes: inc.notes,
                              })
                            }
                            className="rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-[#e11d48] hover:bg-[#e11d48] hover:text-white transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            title="Prévisualiser, imprimer ou télécharger la facture/reçu"
                          >
                            <DocumentReportIcon className="h-3.5 w-3.5" />
                            <span>Facture</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── INVOICE / REÇU MODAL ── */}
      {activeInvoiceData && (
        <InvoiceModal
          isOpen={!!activeInvoiceData}
          onClose={() => setActiveInvoiceData(null)}
          data={activeInvoiceData}
        />
      )}
    </div>
  );
}
