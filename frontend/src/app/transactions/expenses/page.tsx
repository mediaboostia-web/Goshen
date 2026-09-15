'use client';

import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { InvoiceModal, type InvoiceData } from '@/components/invoices/InvoiceModal';
import { DocumentReportIcon, CheckCircleIcon } from '@/components/icons/ChurchIcons';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface ExpenseTransaction {
  id: string;
  amount: number;
  date: string;
  beneficiary: string | null;
  notes: string | null;
  receiptUrl: string | null;
  category: { name: string };
  branch: { name: string };
  author: { name: string | null; email: string };
}

export default function ExpensesPage() {
  const { church, branches, currentBranch, isConsolidated, refreshBranches } = useBranch();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInvoiceData, setActiveInvoiceData] = useState<InvoiceData | null>(null);
  const [lastSavedExpense, setLastSavedExpense] = useState<{
    id: string;
    amount: number;
    categoryName: string;
    branchName: string;
    date: string;
    beneficiary?: string | null;
    notes?: string | null;
  } | null>(null);

  // Modal preview
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0] ?? '');
  const [beneficiary, setBeneficiary] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptPublicId, setReceiptPublicId] = useState<string>('');

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
      const [catsRes, txRes] = await Promise.all([
        api<{ categories: Category[] }>('/api/church/categories'),
        api<{
          transactions: ExpenseTransaction[];
          summary: { totalExpense: number };
        }>(`/api/transactions?type=EXPENSE&branchId=${activeBranchParam}&limit=50`),
      ]);

      const expCats = (catsRes.categories || []).filter((c) => c.type === 'EXPENSE');
      setCategories(expCats);
      const firstCat = expCats[0];
      if (firstCat && !categoryId) {
        setCategoryId(firstCat.id);
      }

      setExpenses(txRes.transactions || []);
      setTotalExpense(txRes.summary?.totalExpense || 0);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [isConsolidated, currentBranch, categoryId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Téléversement échoué');
      }

      const data = await res.json();
      setReceiptUrl(data.url || data.secure_url);
      setReceiptPublicId(data.key || data.public_id || '');
      toast('Photo du reçu téléversée avec succès !', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Échec téléversement du reçu', 'error');
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10);

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0 FCFA.');
      return;
    }
    if (!branchId) {
      setError('Veuillez sélectionner une annexe.');
      return;
    }
    if (!categoryId) {
      setError('Veuillez sélectionner une catégorie.');
      return;
    }

    setSubmitting(true);
    try {
      const createdTx = await api<{ transaction?: { id: string } }>('/api/transactions', {
        method: 'POST',
        body: {
          branchId,
          type: 'EXPENSE',
          amount: parsedAmount,
          categoryId,
          date: new Date(date).toISOString(),
          beneficiary: beneficiary.trim() || undefined,
          notes: notes.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
          receiptPublicId: receiptPublicId || undefined,
        },
      });

      const matchedCat = categories.find((c) => c.id === categoryId);
      const matchedBranch = branches.find((b) => b.id === branchId);

      const savedTxInfo = {
        id: createdTx?.transaction?.id || `EXP-${Date.now()}`,
        amount: parsedAmount,
        categoryName: matchedCat?.name || 'Dépense Ecclésiastique',
        branchName: matchedBranch?.name || currentBranch?.name || 'Siège Principal',
        date,
        beneficiary: beneficiary.trim() || null,
        notes: notes.trim() || null,
      };
      setLastSavedExpense(savedTxInfo);

      toast(`Dépense de ${parsedAmount.toLocaleString('fr-FR')} FCFA enregistrée !`, 'success');
      setAmount('');
      setBeneficiary('');
      setNotes('');
      setReceiptUrl('');
      setReceiptPublicId('');
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

  // Open invoice modal for a specific expense
  const openExpenseInvoice = (tx: {
    id: string;
    amount: number;
    categoryName: string;
    branchName: string;
    date: string;
    beneficiary?: string | null;
    notes?: string | null;
  }) => {
    setActiveInvoiceData({
      invoiceNumber: `DEP-${String(tx.id).slice(0, 8).toUpperCase()}`,
      date: new Date(tx.date).toLocaleDateString('fr-FR'),
      churchName: church?.name || 'COMMUNAUTÉ ÉVANGÉLIQUE DE LA GRÂCE',
      churchDenomination: 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: `${tx.branchName}, Libreville, Gabon`,
      recipientName: tx.beneficiary || 'Prestataire / Fournisseur de Services',
      recipientAddress: 'Libreville, République Gabonaise',
      recipientContact: 'comptabilite@eglise.ga',
      items: [
        {
          no: '01',
          description: tx.categoryName,
          subDescription:
            tx.notes ||
            `Décaissement autorisé — ${tx.beneficiary ? `Bénéficiaire : ${tx.beneficiary}` : 'Justificatif conforme'}`,
          price: tx.amount,
          qty: 1,
          total: tx.amount,
        },
      ],
      subTotal: tx.amount,
      grandTotal: tx.amount,
      paymentMethod: 'Caisse Locale / Virement Bancaire',
      paymentDetails:
        'Décaissement validé par la Trésorerie Générale de Goshen Finance avec signature autorisée.',
      terms:
        'Ce bon de dépense et reçu d’encaissement atteste la sortie effective des fonds du compte ecclésiastique.',
      tax: 0,
      discount: 0,
      signatoryName: 'Steven Joe',
      signatoryRole: 'Trésorier Général & Comptable',
      phone: '+241 01 23 45 67',
      email: 'tresorerie@goshen-finance.org',
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      {/* Modal Preview for Receipt */}
      {previewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewReceiptUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-stone-200">
              <span className="text-xs font-bold text-stone-800">Photo du Justificatif / Reçu</span>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex justify-center">
              <img
                src={previewReceiptUrl}
                alt="Reçu de dépense"
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Dépenses & Décaissements avec Justificatifs
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Enregistrez chaque sortie d’argent avec son motif et attachez la photo du reçu pour une
            traçabilité irréprochable.
          </p>
        </div>

        {/* Success Banner with Instant Print / Download */}
        {lastSavedExpense && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Dépense de {lastSavedExpense.amount.toLocaleString('fr-FR')} FCFA enregistrée avec
                  succès !
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  {lastSavedExpense.categoryName} • {lastSavedExpense.branchName}
                  {lastSavedExpense.beneficiary
                    ? ` • Bénéficiaire: ${lastSavedExpense.beneficiary}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openExpenseInvoice(lastSavedExpense)}
                className="rounded-xl bg-[#e11d48] hover:bg-[#be123c] px-4 py-2 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <DocumentReportIcon className="h-4 w-4" />
                <span>Imprimer / Télécharger Facture-Reçu</span>
              </button>
              <button
                type="button"
                onClick={() => setLastSavedExpense(null)}
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
            <h2 className="font-serif text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 mb-4">
              Nouveau Décaissement
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Montant décaissé (en FCFA) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    placeholder="Ex: 35000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-base font-bold text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden pr-14"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center font-bold text-stone-400">
                    FCFA
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Catégorie de dépense *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Lieu de culte / Annexe *
                </label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.isMain ? '⭐ ' : ''}
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Bénéficiaire / Payé à</label>
                <input
                  type="text"
                  placeholder="Ex: Quincaillerie du Carrefour, Électricien M. Ondo..."
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Date du décaissement</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              {/* Photo du reçu */}
              <div className="rounded-xl border border-dashed border-stone-300 p-3 bg-stone-50">
                <label className="block font-bold text-stone-700 mb-1">
                  Photo du Reçu / Justificatif (Recommandé)
                </label>
                {receiptUrl ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-200 mt-1">
                    <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                      <span>✓</span> Reçu attaché
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceiptUrl('')}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    disabled={uploadingReceipt}
                    className="block w-full text-[11px] text-stone-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-900 hover:file:bg-emerald-200 cursor-pointer"
                  />
                )}
                {uploadingReceipt && (
                  <p className="mt-1 text-[10px] text-stone-500">Téléversement du reçu en cours…</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Commentaire / Motif du décaissement
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Remplacement du câble d'ampli sono endommagé..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-stone-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Validation…' : 'Enregistrer le décaissement &rarr;'}
              </button>
            </form>
          </div>

          {/* Table Card (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2 mb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Historique des Dépenses
                </h2>
                <p className="text-xs text-stone-500">
                  Total décaissé affiché :{' '}
                  <span className="font-bold text-stone-900">
                    -{totalExpense.toLocaleString('fr-FR')} FCFA
                  </span>
                </p>
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-xs text-stone-500">Chargement des dépenses…</p>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                <p>Aucune dépense enregistrée pour la sélection.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 font-medium">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Catégorie & Bénéficiaire</th>
                      <th className="pb-2">Annexe</th>
                      <th className="pb-2 text-right">Montant</th>
                      <th className="pb-2 text-center">Justificatif</th>
                      <th className="pb-2 text-right">Facture / Reçu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 text-stone-600">
                          {new Date(exp.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-stone-900">{exp.category.name}</span>
                          {exp.beneficiary && (
                            <span className="block text-[11px] text-stone-600 font-medium">
                              Payé à : {exp.beneficiary}
                            </span>
                          )}
                          {exp.notes && (
                            <span className="block text-[11px] text-stone-400 truncate max-w-xs">
                              {exp.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-stone-600 font-medium">{exp.branch.name}</td>
                        <td className="py-3 text-right font-bold text-stone-900">
                          -{exp.amount.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="py-3 text-center">
                          {exp.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptUrl(exp.receiptUrl)}
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="Voir le reçu"
                            >
                              📷 Voir reçu
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Sans reçu</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              openExpenseInvoice({
                                id: exp.id,
                                amount: exp.amount,
                                categoryName: exp.category.name,
                                branchName: exp.branch.name,
                                date: exp.date,
                                beneficiary: exp.beneficiary,
                                notes: exp.notes,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-[#e11d48] hover:bg-red-100 text-[11px] font-bold transition-colors cursor-pointer"
                            title="Prévisualiser / Imprimer la facture"
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

      {/* Invoice Modal for Preview, Print & PDF Download */}
      <InvoiceModal
        isOpen={Boolean(activeInvoiceData)}
        onClose={() => setActiveInvoiceData(null)}
        data={activeInvoiceData}
      />
    </div>
  );
}
