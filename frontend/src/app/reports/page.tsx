'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { InvoiceModal, type InvoiceData } from '@/components/invoices/InvoiceModal';
import { DocumentReportIcon } from '@/components/icons/ChurchIcons';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { PAYMENT_METHOD_LABELS, formatPaymentMethods } from '@/lib/utils';

interface ReportPreview {
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpense: number;
  netDifference: number;
  incomesByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  transactionCount: number;
  transactions: {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    date: string;
    category: { name: string };
    branch: { name: string };
    notes: string | null;
    paymentMethod: string | null;
  }[];
}

// A period/bilan invoice covers many transactions — show the method(s) they
// were actually recorded with (e.g. "Espèces, Mobile Money"), never a
// static church-wide default that may not match what was really used.
function summarizePaymentMethods(
  transactions: ReportPreview['transactions'] | undefined,
  fallback: string[] | undefined,
): string {
  const used = Array.from(
    new Set((transactions || []).map((t) => t.paymentMethod).filter((m): m is string => !!m)),
  );
  if (used.length > 0) {
    return used.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ');
  }
  return formatPaymentMethods(fallback);
}

interface ArchivedReport {
  id: string;
  title: string;
  periodType: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpense: number;
  createdAt: string;
  branch: { name: string } | null;
  pdfUrl: string | null;
}

export default function ReportsPage() {
  const { church, branches, currentBranch } = useBranch();
  const { toast } = useToast();

  const [periodType, setPeriodType] = useState<
    'SUNDAY_SERVICE' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM'
  >('SUNDAY_SERVICE');
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? '',
  );
  const [startDate, setStartDate] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? '',
  );
  const [endDate, setEndDate] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? '',
  );
  const [branchScope, setBranchScope] = useState<string>(() => currentBranch?.id || '');

  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [archived, setArchived] = useState<ArchivedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [modalInvoiceData, setModalInvoiceData] = useState<InvoiceData | null>(null);
  const [downloadingTxId, setDownloadingTxId] = useState<string | null>(null);
  const [showBilanPreview, setShowBilanPreview] = useState<boolean>(false);
  const [printRequested, setPrintRequested] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentBranch) {
      setBranchScope(currentBranch.id);
    } else if (branches.length > 0 && branches[0]) {
      setBranchScope(branches[0].id);
    }
  }, [currentBranch, branches]);

  // Adjust start and end dates based on periodType
  useEffect(() => {
    const now = new Date(selectedDate);
    if (periodType === 'SUNDAY_SERVICE') {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    } else if (periodType === 'MONTHLY') {
      const firstDay =
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] ?? '';
      const lastDay =
        new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] ?? '';
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (periodType === 'QUARTERLY') {
      const q = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0] ?? '';
      const lastDay = new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString().split('T')[0] ?? '';
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [periodType, selectedDate]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ preview: ReportPreview }>(
        `/api/reports?preview=true&startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z&branchId=${branchScope}`,
      );
      setPreview(res.preview);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, branchScope]);

  const loadArchived = useCallback(async () => {
    try {
      const res = await api<{ reports: ArchivedReport[] }>('/api/reports');
      setArchived(res.reports || []);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    void loadPreview();
    void loadArchived();
  }, [loadPreview, loadArchived]);

  async function handleArchiveReport() {
    if (!preview) return;
    setSaving(true);
    try {
      const title =
        periodType === 'SUNDAY_SERVICE'
          ? `Bilan du Culte &bull; ${new Date(startDate).toLocaleDateString('fr-FR')}`
          : `Rapport Financier &bull; ${startDate} au ${endDate}`;

      await api('/api/reports', {
        method: 'POST',
        body: {
          title,
          periodType,
          branchId: branchScope === 'CONSOLIDATED' ? undefined : branchScope,
          startDate: `${startDate}T00:00:00.000Z`,
          endDate: `${endDate}T23:59:59.999Z`,
        },
      });

      toast('Rapport officiel archivé avec succès !', 'success');
      await loadArchived();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur archivage', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    if (!preview) return;
    setShowBilanPreview(true);
    setPrintRequested(true);
  }

  // The bilan card is unmounted when hidden, so window.print() needs to wait
  // for it to actually be in the DOM after handlePrint reveals it.
  useEffect(() => {
    if (printRequested && showBilanPreview) {
      window.print();
      setPrintRequested(false);
    }
  }, [printRequested, showBilanPreview]);

  const selectedBranchObj = branches.find((b) => b.id === branchScope);

  const invoiceData: InvoiceData = {
    invoiceNumber: `INV-${new Date().getFullYear()}-${periodType.slice(0, 3)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    date: new Date(startDate).toLocaleDateString('fr-FR'),
    dueDate: new Date(endDate).toLocaleDateString('fr-FR'),
    churchName: church?.name || 'Votre Église',
    ...(church?.logoUrl ? { churchLogoUrl: church.logoUrl } : {}),
    churchDenomination: church?.denomination || 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
    churchAddress: selectedBranchObj?.name || '',
    recipientName: selectedBranchObj?.name
      ? `Conseil Paroissial - ${selectedBranchObj.name}`
      : 'Bureau National de Coordination des Finances',
    recipientAddress: '',
    recipientContact: '',
    items:
      preview?.transactions && preview.transactions.length > 0
        ? preview.transactions.slice(0, 6).map((tx, idx) => ({
            no: String(idx + 1).padStart(2, '0'),
            description:
              tx.category?.name ||
              (tx.type === 'INCOME' ? 'Offrande de culte' : 'Charge de fonctionnement'),
            subDescription:
              tx.notes ||
              `Écriture enregistrée le ${new Date(tx.date).toLocaleDateString('fr-FR')}`,
            amount: tx.amount,
          }))
        : [],
    total: preview?.totalIncome || 0,
    paymentMethod: summarizePaymentMethods(preview?.transactions, church?.paymentMethods),
    ...(church?.paymentDetails ? { paymentDetails: church.paymentDetails } : {}),
    terms:
      'Cette facture et récépissé comptable atteste la régularité des écritures inscrites dans les registres de l’église conformément aux normes comptables en vigueur.',
    ...(church?.phone ? { phone: church.phone } : {}),
    ...(church?.email ? { email: church.email } : {}),
  };

  function buildTransactionInvoiceData(tx: ReportPreview['transactions'][number]): InvoiceData {
    const isIncome = tx.type === 'INCOME';
    return {
      transactionId: tx.id,
      invoiceNumber: `REC-${String(tx.id).slice(0, 8).toUpperCase()}`,
      date: new Date(tx.date).toLocaleDateString('fr-FR'),
      churchName: church?.name || 'Votre Église',
      ...(church?.logoUrl ? { churchLogoUrl: church.logoUrl } : {}),
      churchDenomination: church?.denomination || 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: tx.branch.name,
      recipientName: isIncome
        ? 'Culte Dominical & Assemblée Locale'
        : `Bénéficiaire — ${tx.category.name}`,
      recipientAddress: '',
      recipientContact: '',
      items: [
        {
          no: '01',
          description: tx.category.name,
          subDescription: tx.notes || `Écriture enregistrée le ${tx.branch.name}`,
          amount: tx.amount,
        },
      ],
      total: tx.amount,
      paymentMethod: tx.paymentMethod
        ? (PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod)
        : formatPaymentMethods(church?.paymentMethods),
      ...(church?.paymentDetails ? { paymentDetails: church.paymentDetails } : {}),
      terms: 'Récépissé officiel certifié conforme aux registres paroissiaux de l’église.',
      ...(church?.phone ? { phone: church.phone } : {}),
      ...(church?.email ? { email: church.email } : {}),
    };
  }

  function openTransactionPreview(tx: ReportPreview['transactions'][number]) {
    setModalInvoiceData(buildTransactionInvoiceData(tx));
    setIsInvoiceModalOpen(true);
  }

  async function downloadTransactionInvoice(tx: ReportPreview['transactions'][number]) {
    setDownloadingTxId(tx.id);
    try {
      const built = buildTransactionInvoiceData(tx);
      const res = await api<{ transaction: { receiptUrl: string | null } }>(
        `/api/transactions/${tx.id}/invoice`,
        {
          method: 'POST',
          body: {
            invoiceNumber: built.invoiceNumber,
            date: built.date,
            recipientName: built.recipientName,
            recipientAddress: built.recipientAddress,
            recipientContact: built.recipientContact,
            items: built.items,
            total: built.total,
            paymentMethod: built.paymentMethod,
            paymentDetails: built.paymentDetails,
            terms: built.terms,
            phone: built.phone,
            email: built.email,
          },
        },
      );
      if (res.transaction?.receiptUrl) {
        window.open(res.transaction.receiptUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast('Le PDF n’a pas pu être généré pour le moment.', 'error');
      }
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : 'Téléchargement impossible pour le moment.',
        'error',
      );
    } finally {
      setDownloadingTxId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-stone-900 pb-24 md:pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Header (Hidden on print) */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
              Génération des Rapports Financiers & Factures
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Éditez en 1 clic le compte-rendu dominical officiel ou la facture récapitulative A4
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* New Preview Invoice Button */}
            <button
              type="button"
              onClick={() => {
                setModalInvoiceData(invoiceData);
                setIsInvoiceModalOpen(true);
              }}
              disabled={!preview}
              className="rounded-xl bg-[#e11d48] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#be123c] disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <DocumentReportIcon className="h-4 w-4" />
              <span>Facture / Reçu</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBilanPreview((v) => !v)}
              disabled={!preview}
              className="rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showBilanPreview ? 'Masquer l’aperçu' : 'Aperçu du Bilan'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!preview}
              className="rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Imprimer Bilan</span>
            </button>
            <button
              type="button"
              onClick={handleArchiveReport}
              disabled={saving || !preview}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              {saving ? 'Archivage…' : 'Archiver'}
            </button>
          </div>
        </div>

        {/* Filter Controls (Hidden on print) */}
        <div className="print:hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Période du rapport</label>
            <Select
              aria-label="Période du rapport"
              value={periodType}
              onChange={(v) =>
                setPeriodType(v as 'SUNDAY_SERVICE' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM')
              }
              options={[
                { value: 'SUNDAY_SERVICE', label: 'Culte Dominical (Jour précis)' },
                { value: 'MONTHLY', label: 'Mois Calendaire' },
                { value: 'QUARTERLY', label: 'Trimestre' },
                { value: 'CUSTOM', label: 'Dates personnalisées' },
              ]}
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">
              {periodType === 'SUNDAY_SERVICE' ? 'Date du culte' : 'Mois / Date de référence'}
            </label>
            <DatePicker value={selectedDate} onChange={setSelectedDate} />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Paroisse / Annexe concernée
            </label>
            <div className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-stone-800 flex items-center justify-between">
              <span className="font-semibold truncate">
                {currentBranch?.name || branches[0]?.name || 'Siège Principal'}
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0">
                Annexe active
              </span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadPreview}
              disabled={loading}
              className="w-full rounded-xl bg-stone-900 py-2.5 font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Calcul en cours…' : 'Actualiser le bilan'}
            </button>
          </div>
        </div>

        {/* Individual invoices for the period (Hidden on print) — primary
            content: the page lands here instead of an unrequested bilan
            preview, which only appears via "Aperçu du Bilan" below. */}
        {preview && preview.transactions.length > 0 && (
          <div className="print:hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 mb-4">
              Factures & Reçus de la période ({preview.transactions.length})
            </h2>
            <div className="divide-y divide-stone-100 text-xs">
              {preview.transactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold text-stone-900 truncate block">
                      {tx.category.name}
                    </span>
                    <p className="text-[11px] text-stone-500">
                      {new Date(tx.date).toLocaleDateString('fr-FR')} &bull; {tx.branch.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        tx.type === 'INCOME' ? 'text-emerald-800' : 'text-stone-800'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}
                      {tx.amount.toLocaleString('fr-FR')} FCFA
                    </span>
                    <button
                      type="button"
                      onClick={() => openTransactionPreview(tx)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 hover:bg-stone-100 font-bold text-[#e11d48] flex items-center gap-1 cursor-pointer"
                      title="Prévisualiser la facture"
                    >
                      <DocumentReportIcon className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Aperçu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadTransactionInvoice(tx)}
                      disabled={downloadingTxId === tx.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 hover:bg-emerald-100 disabled:opacity-60 font-bold text-emerald-800 flex items-center gap-1 cursor-pointer"
                      title="Télécharger la facture PDF"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span className="text-[11px]">
                        {downloadingTxId === tx.id ? '…' : 'Télécharger'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Printable Official A4 Report Section — hidden until the user asks
            to see it via "Aperçu du Bilan" (or "Imprimer Bilan A4", which
            reveals it then prints). */}
        {preview && showBilanPreview && (
          <div
            ref={printableRef}
            className="print-area rounded-2xl border border-stone-300 bg-white p-8 sm:p-12 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0"
          >
            <div className="print:hidden flex justify-end -mt-4 -mr-4 mb-2 sm:-mt-8 sm:-mr-8">
              <button
                type="button"
                onClick={() => setShowBilanPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 font-bold transition-colors cursor-pointer"
                title="Masquer l’aperçu"
              >
                &times;
              </button>
            </div>
            {/* Header with church info */}
            <div className="border-b-2 border-emerald-900 pb-6 flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
                  {church?.denomination || 'Communauté Chrétienne'}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                  {church?.name}
                </h2>
                <p className="text-xs text-stone-500 mt-1 font-medium">
                  {branchScope === 'CONSOLIDATED'
                    ? 'Rapport Consolidé de toutes les annexes'
                    : `Annexe locale : ${selectedBranchObj?.name || 'Annexe'}`}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block rounded bg-emerald-100 px-3 py-1 font-serif text-sm font-bold text-emerald-950">
                  RAPPORT FINANCIER
                </span>
                <p className="text-xs text-stone-500 mt-2">
                  Période :{' '}
                  <strong className="text-stone-800">
                    {new Date(startDate).toLocaleDateString('fr-FR')} &rarr;{' '}
                    {new Date(endDate).toLocaleDateString('fr-FR')}
                  </strong>
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Édité le {new Date().toLocaleDateString('fr-FR')} via Goshen
                </p>
              </div>
            </div>

            {/* Financial Summary Table */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-y border-stone-200 py-4 bg-stone-50">
              <div>
                <span className="text-[11px] text-stone-500 font-medium">Solde d’ouverture</span>
                <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-stone-900 mt-1">
                  {preview.openingBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div>
                <span className="text-[11px] text-emerald-700 font-medium">+ Total Entrées</span>
                <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-emerald-800 mt-1">
                  +{preview.totalIncome.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div>
                <span className="text-[11px] text-stone-600 font-medium">
                  - Total Décaissements
                </span>
                <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-stone-800 mt-1">
                  -{preview.totalExpense.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div>
                <span className="text-[11px] text-emerald-950 font-bold">= Solde de clôture</span>
                <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-emerald-950 mt-1">
                  {preview.closingBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {/* Incomes and Expenses breakdown grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              {/* Incomes Breakdown */}
              <div>
                <h3 className="font-serif text-sm font-bold text-emerald-950 pb-2 border-b border-emerald-200 uppercase tracking-wider flex justify-between">
                  <span>Détail des Entrées</span>
                  <span className="font-mono tabular-nums text-emerald-800">
                    +{preview.totalIncome.toLocaleString('fr-FR')} FCFA
                  </span>
                </h3>
                <div className="mt-3 space-y-2">
                  {Object.keys(preview.incomesByCategory).length === 0 ? (
                    <p className="text-stone-400 italic">Aucune entrée sur cette période.</p>
                  ) : (
                    Object.entries(preview.incomesByCategory).map(([catName, sum]) => (
                      <div
                        key={catName}
                        className="flex justify-between py-1 border-b border-stone-100"
                      >
                        <span className="text-stone-700 font-medium">{catName}</span>
                        <span className="font-mono tabular-nums font-bold text-stone-900">
                          {sum.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div>
                <h3 className="font-serif text-sm font-bold text-stone-900 pb-2 border-b border-stone-200 uppercase tracking-wider flex justify-between">
                  <span>Détail des Décaissements</span>
                  <span className="font-mono tabular-nums text-stone-800">
                    -{preview.totalExpense.toLocaleString('fr-FR')} FCFA
                  </span>
                </h3>
                <div className="mt-3 space-y-2">
                  {Object.keys(preview.expensesByCategory).length === 0 ? (
                    <p className="text-stone-400 italic">Aucune dépense sur cette période.</p>
                  ) : (
                    Object.entries(preview.expensesByCategory).map(([catName, sum]) => (
                      <div
                        key={catName}
                        className="flex justify-between py-1 border-b border-stone-100"
                      >
                        <span className="text-stone-700 font-medium">{catName}</span>
                        <span className="font-mono tabular-nums font-bold text-stone-900">
                          {sum.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="mt-14 pt-8 border-t border-stone-200 grid grid-cols-2 gap-12 text-xs">
              <div className="text-center">
                <p className="font-bold text-stone-800">Pour le Pasteur Principal</p>
                <p className="text-[11px] text-stone-400 mt-1">Signature & Sceau de l’église</p>
                <div className="mt-12 border-b border-dashed border-stone-300 w-40 mx-auto" />
              </div>
              <div className="text-center">
                <p className="font-bold text-stone-800">Pour le Trésorier Général</p>
                <p className="text-[11px] text-stone-400 mt-1">Signature & Visa de contrôle</p>
                <div className="mt-12 border-b border-dashed border-stone-300 w-40 mx-auto" />
              </div>
            </div>

            {/* Theological stamp / footer */}
            <div className="mt-10 pt-4 border-t border-stone-100 text-center text-[10px] text-stone-400 italic">
              « Que tout se fasse avec bienséance et avec ordre. » &mdash; 1 Corinthiens 14:40
              &bull; Document généré via Goshen Finance.
            </div>
          </div>
        )}

        {/* Archived reports list (Hidden on print) */}
        {archived.length > 0 && (
          <div className="print:hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 mb-4">
              Rapports Archivés
            </h2>
            <div className="divide-y divide-stone-100 text-xs">
              {archived.map((rep) => (
                <div key={rep.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900">{rep.title}</span>
                    <p className="text-[11px] text-stone-500">
                      Archivé le {new Date(rep.createdAt).toLocaleDateString('fr-FR')} &bull;{' '}
                      {rep.branch?.name || 'Vue Consolidée'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums font-bold text-emerald-800">
                      Solde : {rep.closingBalance.toLocaleString('fr-FR')} FCFA
                    </span>
                    {rep.pdfUrl ? (
                      <a
                        href={rep.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 hover:bg-emerald-100 font-bold text-emerald-800 flex items-center gap-1"
                        title="Télécharger le rapport PDF"
                      >
                        <DocumentReportIcon className="h-3.5 w-3.5" />
                        <span className="text-[11px]">PDF</span>
                      </a>
                    ) : (
                      <span
                        className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-400 text-[11px] font-semibold"
                        title="PDF indisponible (stockage non configuré au moment de la génération)"
                      >
                        PDF indisponible
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setModalInvoiceData(invoiceData);
                        setIsInvoiceModalOpen(true);
                      }}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 hover:bg-stone-100 font-bold text-[#e11d48] flex items-center gap-1 cursor-pointer"
                      title="Voir la facture officielle"
                    >
                      <DocumentReportIcon className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Facture</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── INVOICE / REÇU COMPTABLE MODAL (EXACT USER IMAGE REPRODUCTION) ── */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        data={modalInvoiceData}
      />
    </div>
  );
}
