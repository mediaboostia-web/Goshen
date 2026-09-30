'use client';

import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, ApiError } from '@/lib/api';
import { queueMutation } from '@/lib/offlineQueue';
import { COOKIE_PREFIX } from '@/lib/constants';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { InvoiceModal, type InvoiceData } from '@/components/invoices/InvoiceModal';
import { DocumentReportIcon, CheckCircleIcon } from '@/components/icons/ChurchIcons';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { PAYMENT_METHOD_LABELS, formatPaymentMethods, getCurrencyLabel } from '@/lib/utils';

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
  paymentMethod: string | null;
  category: { name: string };
  branch: { name: string };
  author: { name: string | null; email: string };
}

export default function ExpensesPage() {
  const { church, branches, currentBranch, isConsolidated, refreshBranches } = useBranch();
  const { toast } = useToast();
  const { locale, t } = useLanguage();
  const localeCode = locale === 'en' ? 'en-US' : 'fr-FR';
  const currency = getCurrencyLabel(church?.currency);

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
  const [paymentMethod, setPaymentMethod] = useState<string>('');
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

      // Raw fetch (not api()) because api() forces a JSON Content-Type,
      // incompatible with multipart FormData — so the CSRF header that
      // api() normally attaches automatically has to be read and set here.
      const csrfCookieName = `${COOKIE_PREFIX}-csrf`;
      const csrfMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${csrfCookieName}=([^;]*)`));
      const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : '';

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || t('expenses.upload_failed'));
      }

      const data = await res.json();
      setReceiptUrl(data.url || data.secure_url);
      setReceiptPublicId(data.key || data.public_id || '');
      toast(t('expenses.receipt_uploaded_toast'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('expenses.upload_error_fallback'), 'error');
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number.parseInt(amount.replace(/\D/g, ''), 10);

    if (!parsedAmount || parsedAmount <= 0) {
      setError(`${t('incomes.invalid_amount_error')} ${currency}.`);
      return;
    }
    if (!branchId) {
      setError(t('expenses.no_branch_error'));
      return;
    }
    if (!categoryId) {
      setError(t('incomes.no_category_error'));
      return;
    }

    const payload = {
      branchId,
      type: 'EXPENSE',
      amount: parsedAmount,
      categoryId,
      date: new Date(date).toISOString(),
      beneficiary: beneficiary.trim() || undefined,
      notes: notes.trim() || undefined,
      receiptUrl: receiptUrl || undefined,
      receiptPublicId: receiptPublicId || undefined,
      paymentMethod: paymentMethod || undefined,
    };

    function resetForm() {
      setAmount('');
      setBeneficiary('');
      setNotes('');
      setPaymentMethod('');
      setReceiptUrl('');
      setReceiptPublicId('');
    }

    // Offline: queue the entry instead of failing outright — it syncs
    // automatically once PwaRegister sees the connection come back.
    if (!navigator.onLine) {
      queueMutation({
        url: '/api/transactions',
        method: 'POST',
        body: payload,
        label: `${t('expenses.queue_label_prefix')} ${parsedAmount.toLocaleString('fr-FR')} ${currency}`,
      });
      toast(
        `${t('expenses.offline_queued_toast_prefix')} ${parsedAmount.toLocaleString('fr-FR')} ${currency} ${t('incomes.offline_queued_toast_suffix')}`,
        'info',
      );
      resetForm();
      return;
    }

    setSubmitting(true);
    try {
      const createdTx = await api<{ transaction?: { id: string } }>('/api/transactions', {
        method: 'POST',
        body: payload,
      });

      const matchedCat = categories.find((c) => c.id === categoryId);
      const matchedBranch = branches.find((b) => b.id === branchId);

      const savedTxInfo = {
        id: createdTx?.transaction?.id || `EXP-${Date.now()}`,
        amount: parsedAmount,
        categoryName: matchedCat?.name || t('expenses.default_category_fallback'),
        branchName:
          matchedBranch?.name ||
          currentBranch?.name ||
          t('reports.main_hq_fallback', 'Siège Principal'),
        date,
        beneficiary: beneficiary.trim() || null,
        notes: notes.trim() || null,
      };
      setLastSavedExpense(savedTxInfo);

      toast(
        `${t('expenses.success_toast_prefix')} ${parsedAmount.toLocaleString('fr-FR')} ${currency} ${t('incomes.success_toast_suffix')}`,
        'success',
      );
      resetForm();
      await loadData();
      await refreshBranches();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t('incomes.save_error'));
      } else {
        // Connection dropped mid-request — queue it rather than losing the entry.
        queueMutation({
          url: '/api/transactions',
          method: 'POST',
          body: payload,
          label: `${t('expenses.queue_label_prefix')} ${parsedAmount.toLocaleString('fr-FR')} ${currency}`,
        });
        toast(t('expenses.connection_lost_toast'), 'info');
        resetForm();
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
    paymentMethod?: string | null;
  }) => {
    setActiveInvoiceData({
      transactionId: tx.id,
      invoiceNumber: `DEP-${String(tx.id).slice(0, 8).toUpperCase()}`,
      date: new Date(tx.date).toLocaleDateString(localeCode),
      churchName: church?.name || t('invoice.default_church_name'),
      ...(church?.logoUrl ? { churchLogoUrl: church.logoUrl } : {}),
      churchDenomination: t('invoice.default_denomination'),
      churchAddress: tx.branchName,
      recipientName: tx.beneficiary || t('invoice.default_provider'),
      recipientAddress: '',
      recipientContact: '',
      items: [
        {
          no: '01',
          description: tx.categoryName,
          subDescription:
            tx.notes ||
            `${t('invoice.expense_authorized_prefix')} ${tx.beneficiary ? `${t('invoice.beneficiary_label')} ${tx.beneficiary}` : t('invoice.supporting_doc_compliant')}`,
          amount: tx.amount,
        },
      ],
      total: tx.amount,
      paymentMethod: tx.paymentMethod
        ? (PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod)
        : formatPaymentMethods(church?.paymentMethods),
      ...(church?.paymentDetails ? { paymentDetails: church.paymentDetails } : {}),
      terms: t('invoice.expense_terms'),
      ...(church?.phone ? { phone: church.phone } : {}),
      ...(church?.email ? { email: church.email } : {}),
      currency: church?.currency,
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
              <span className="text-xs font-bold text-stone-800">
                {t('expenses.receipt_modal_title')}
              </span>
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
                alt={t('expenses.receipt_modal_alt')}
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            {t('expenses.page_title')}
          </h1>
          <p className="text-xs text-stone-500 mt-1">{t('expenses.page_subtitle')}</p>
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
                  {t('expenses.saved_banner_prefix')}{' '}
                  {lastSavedExpense.amount.toLocaleString('fr-FR')} {currency}{' '}
                  {t('incomes.saved_banner_suffix', 'enregistrée avec succès !')}
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  {lastSavedExpense.categoryName} • {lastSavedExpense.branchName}
                  {lastSavedExpense.beneficiary
                    ? ` ${t('expenses.beneficiary_inline_prefix')} ${lastSavedExpense.beneficiary}`
                    : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLastSavedExpense(null)}
              className="text-emerald-800 hover:text-emerald-950 font-bold px-2 py-1 text-sm cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card (1 col) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs h-fit">
            <h2 className="font-serif text-lg font-bold text-stone-900 pb-3 mb-4 flex items-center justify-between gap-2 border-b border-stone-100">
              <span>{t('expenses.new_expense_title')}</span>
              <span className="text-[11px] font-medium text-stone-400 truncate">
                {isConsolidated
                  ? t('incomes.choose_branch_hint', 'Choisir une annexe ↑')
                  : currentBranch?.name}
              </span>
            </h2>

            {!church?.isTreasurer && !church?.isPastor ? (
              <p className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-500">
                {t('expenses.readonly_access_note')}
              </p>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('expenses.amount_label_prefix')} {currency}) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="100"
                        step="100"
                        required
                        placeholder={t('expenses.amount_placeholder')}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-base font-mono font-bold text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden pr-14"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center font-bold text-stone-400">
                        {currency}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('expenses.category_label')}
                    </label>
                    {categories.length === 0 && !loading && (
                      <p className="mb-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                        {t('expenses.no_category_exists')}{' '}
                        <Link href="/settings/church" className="font-bold underline">
                          {t('transactions.create_category_link')}
                        </Link>
                        .
                      </p>
                    )}
                    <Select
                      aria-label={t('expenses.category_aria')}
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      value={categoryId}
                      onChange={setCategoryId}
                      placeholder={t('transactions.choose_category_placeholder')}
                    />
                  </div>

                  {/* No annexe/branch field here on purpose — see incomes/page.tsx
                  for the same note. The expense is recorded against whichever
                  annexe is active in the header switcher. */}

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('expenses.beneficiary_label')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('expenses.beneficiary_placeholder')}
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('expenses.disbursement_date_label')}
                    </label>
                    <DatePicker value={date} onChange={setDate} />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('transactions.payment_method_label')}
                    </label>
                    <Select
                      aria-label={t('transactions.payment_method_aria')}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      placeholder={`Par défaut (${formatPaymentMethods(church?.paymentMethods)})`}
                      options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </div>

                  {/* Photo du reçu */}
                  <div className="rounded-xl border border-dashed border-stone-300 p-3 bg-stone-50">
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('expenses.receipt_upload_label')}
                    </label>
                    {receiptUrl ? (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-200 mt-1">
                        <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                          <span>✓</span> {t('expenses.receipt_attached_label')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReceiptUrl('')}
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          {t('expenses.remove_button')}
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
                      <p className="mt-1 text-[10px] text-stone-500">
                        {t('expenses.uploading_receipt')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('expenses.notes_label')}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={t('expenses.notes_placeholder')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || categories.length === 0}
                    className="w-full rounded-lg bg-stone-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? t('expenses.validating') : t('expenses.submit_button')}
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
                  {t('expenses.history_title')}
                </h2>
                <p className="text-xs text-stone-500">
                  {t('expenses.total_displayed_label')}{' '}
                  <span className="font-mono tabular-nums font-bold text-stone-900">
                    -{totalExpense.toLocaleString('fr-FR')} {currency}
                  </span>
                </p>
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-xs text-stone-500">{t('expenses.loading')}</p>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                <p>{t('expenses.empty_state')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 font-medium">
                      <th className="pb-2">{t('incomes.col_date', 'Date')}</th>
                      <th className="pb-2">{t('expenses.col_category_beneficiary')}</th>
                      <th className="pb-2">{t('incomes.col_branch', 'Annexe')}</th>
                      <th className="pb-2 text-right">{t('incomes.col_amount', 'Montant')}</th>
                      <th className="pb-2 text-center">{t('expenses.col_receipt')}</th>
                      <th className="pb-2 text-right">{t('expenses.col_invoice_receipt')}</th>
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
                              {t('expenses.paid_to_prefix')} {exp.beneficiary}
                            </span>
                          )}
                          {exp.notes && (
                            <span className="block text-[11px] text-stone-400 truncate max-w-xs">
                              {exp.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-stone-600 font-medium">{exp.branch.name}</td>
                        <td className="py-3 text-right font-mono tabular-nums font-bold text-stone-900">
                          -{exp.amount.toLocaleString('fr-FR')} {currency}
                        </td>
                        <td className="py-3 text-center">
                          {exp.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptUrl(exp.receiptUrl)}
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title={t('expenses.view_receipt_title')}
                            >
                              {t('expenses.view_receipt_label')}
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">
                              {t('expenses.no_receipt_label')}
                            </span>
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
                                paymentMethod: exp.paymentMethod,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-[#e11d48] hover:bg-red-100 text-[11px] font-bold transition-colors cursor-pointer"
                            title={t('expenses.invoice_title_attr')}
                          >
                            <DocumentReportIcon className="h-3.5 w-3.5" />
                            <span>{t('dashboard.invoice_button_label', 'Facture')}</span>
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
