'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { InvoiceModal, type InvoiceData } from '@/components/invoices/InvoiceModal';
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton';
import {
  PAYMENT_METHOD_LABELS,
  formatPaymentMethods,
  getCurrencyLabel,
  getCurrencyShort,
} from '@/lib/utils';
import {
  ChurchIcon,
  CoinsHandIcon,
  ReceiptTextIcon,
  LightningBoltIcon,
  DocumentReportIcon,
  ShieldCheckIcon,
  BuildingBranchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CameraIcon,
  CalendarClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GiftIcon,
  HeartHandIcon,
  ChevronDownIcon,
  PlusIcon,
} from '@/components/icons/ChurchIcons';

interface TransactionItem {
  id: string;
  type: 'INCOME' | 'EXPENSE';
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

// Shape the real API data is mapped into in `displayTransactions` below —
// just enough for handleOpenTransactionInvoice to build an invoice from it.
interface DisplayTransaction {
  id?: string;
  date?: string;
  branchName?: string;
  beneficiary?: string | null;
  type?: 'INCOME' | 'EXPENSE';
  categoryName?: string;
  notes?: string | null;
  amount: number;
  authorName?: string;
  paymentMethod?: string | null;
}

interface PendingExecution {
  id: string;
  dueDate: string;
  amount: number;
  recurringExpense: {
    name: string;
    branch: { name: string };
    category: { name: string };
  };
}

// Mirrors the shape of the balance card + metrics + transaction list below
// (heights/proportions match, not the exact content) so nothing jumps
// around once the real data swaps in.
function DashboardSkeleton() {
  return (
    <>
      <section className="rounded-2xl border border-emerald-800/80 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <Skeleton className="h-12 w-12 rounded-2xl bg-emerald-800/60" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-40 bg-emerald-800/60" />
              <Skeleton className="h-3 w-28 bg-emerald-800/60" />
            </div>
          </div>
          <Skeleton className="h-8 w-32 rounded-xl bg-emerald-800/60" />
        </div>
        <div className="py-6 sm:py-8 space-y-3">
          <Skeleton className="h-3 w-56 bg-emerald-800/60" />
          <Skeleton className="h-12 w-72 bg-emerald-800/60" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-emerald-800/80">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl bg-emerald-800/60" />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <Skeleton className="h-4 w-48" />
        <div className="mt-4 divide-y divide-stone-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </section>
    </>
  );
}

import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const {
    church,
    branches,
    currentBranch,
    isConsolidated,
    selectBranch,
    refreshBranches,
    loading: branchLoading,
    error: branchError,
  } = useBranch();

  const currency = getCurrencyLabel(church?.currency);
  const currencyShort = getCurrencyShort(church?.currency);

  // Real data states
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [pendingRecurrents, setPendingRecurrents] = useState<PendingExecution[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // UI interaction states
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [activeInvoiceData, setActiveInvoiceData] = useState<InvoiceData | null>(null);
  const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'MONTH' | 'SUNDAY' | 'QUARTER'>('MONTH');

  // Branch switcher & Modal states
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState<boolean>(false);

  // Add branch form state
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchCity, setNewBranchCity] = useState<string>('');
  const [newBranchThreshold, setNewBranchThreshold] = useState<string>('200000');
  const [newBranchBalance, setNewBranchBalance] = useState<string>('0');
  const [isCreatingBranch, setIsCreatingBranch] = useState<boolean>(false);
  const [branchActionMessage, setBranchActionMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!church) return;
    setDataLoading(true);
    setLoadError(null);
    try {
      const branchParam = isConsolidated ? 'CONSOLIDATED' : currentBranch?.id;
      const [txRes, recRes] = await Promise.all([
        api<{
          transactions: TransactionItem[];
          summary: { totalIncome: number; totalExpense: number };
        }>(`/api/transactions?branchId=${branchParam}&limit=12`),
        api<{ pendingExecutions: PendingExecution[] }>(
          `/api/recurrent-expenses?branchId=${branchParam}`,
        ),
      ]);

      setTransactions(txRes.transactions || []);
      setTotalIncome(txRes.summary?.totalIncome || 0);
      setTotalExpense(txRes.summary?.totalExpense || 0);
      setPendingRecurrents(recRes.pendingExecutions || []);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message || 'Impossible de charger vos données.'
          : 'Erreur réseau. Veuillez réessayer.',
      );
    } finally {
      setDataLoading(false);
    }
  }, [church, isConsolidated, currentBranch]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    // branchError means the church lookup itself failed (e.g. a transient
    // DB hiccup) — not that this user genuinely has no church yet. Treating
    // the two the same used to bounce a returning user with a real church
    // into onboarding on nothing more than a slow/flaky request, tempting
    // them into creating a duplicate church out of confusion.
    if (!authLoading && !branchLoading && user && !church && !branchError) {
      router.replace('/onboarding');
      return;
    }
    if (church) {
      void fetchDashboardData();
    }
  }, [authLoading, branchLoading, user, church, branchError, router, fetchDashboardData]);

  // Branch switcher handler
  const handleSwitchBranch = (id: string | 'CONSOLIDATED') => {
    selectBranch(id);
    setIsBranchDropdownOpen(false);
  };

  // Create branch handler
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setIsCreatingBranch(true);
    try {
      await api('/api/church/branches', {
        method: 'POST',
        body: {
          name: newBranchName.trim(),
          city: newBranchCity.trim() || null,
          lowBalanceThreshold: Number(newBranchThreshold) || 200000,
          initialBalance: Number(newBranchBalance) || 0,
        },
      });
      await refreshBranches();
      setBranchActionMessage(`Nouvelle annexe "${newBranchName.trim()}" enregistrée.`);

      setNewBranchName('');
      setNewBranchCity('');
      setNewBranchBalance('0');
      setNewBranchThreshold('200000');
      setIsAddBranchModalOpen(false);
      setTimeout(() => setBranchActionMessage(null), 5000);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erreur lors de la création de l’annexe.');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Available branches list unified
  const availableBranches = useMemo(() => {
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city || '',
      balance: b.currentBalance,
      threshold: b.lowBalanceThreshold,
      isMain: b.isMain,
    }));
  }, [branches]);

  const activeBranchLabel = useMemo(() => {
    if (isConsolidated) return 'Vue Consolidée (Toutes les Paroisses)';
    return currentBranch?.name || 'Paroisse Principale';
  }, [isConsolidated, currentBranch]);

  const activeBalance = useMemo(() => {
    return isConsolidated
      ? branches.reduce((acc, b) => acc + b.currentBalance, 0)
      : currentBranch?.currentBalance || 0;
  }, [isConsolidated, currentBranch, branches]);

  const activeThreshold = useMemo(() => {
    return isConsolidated
      ? branches.reduce((acc, b) => acc + b.lowBalanceThreshold, 0)
      : currentBranch?.lowBalanceThreshold || 100000;
  }, [isConsolidated, currentBranch, branches]);

  const activeIncomes = totalIncome;
  const activeExpenses = totalExpense;

  const activePendingRecurrents = useMemo(() => {
    return pendingRecurrents.map((r) => ({
      id: r.id,
      name: r.recurringExpense.name,
      branchName: r.recurringExpense.branch.name,
      category: r.recurringExpense.category.name,
      amount: r.amount,
      dueDate: r.dueDate,
      urgent: new Date(r.dueDate).getTime() - Date.now() < 3 * 24 * 3600 * 1000,
    }));
  }, [pendingRecurrents]);

  // Real per-category breakdown of the income transactions currently
  // loaded (most recent, see fetchDashboardData) — replaces the old
  // hardcoded demo chart. Percentages are relative to this loaded set, not
  // a separate monthly total, so the segmented bar and its legend always
  // add up to 100% of what's actually shown.
  const BREAKDOWN_COLORS = [
    '#0a6f66',
    '#0d9488',
    '#c5a059',
    '#4a5670',
    '#b45309',
    '#0369a1',
    '#7c3aed',
  ];
  const incomeBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'INCOME') continue;
      const key = tx.category?.name || 'Autre';
      totals.set(key, (totals.get(key) || 0) + tx.amount);
    }
    const sum = Array.from(totals.values()).reduce((acc, v) => acc + v, 0);
    return Array.from(totals.entries())
      .map(([category, amount], idx) => ({
        category,
        amount,
        percentage: sum > 0 ? Math.round((amount / sum) * 1000) / 10 : 0,
        color: BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length] as string,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Open invoice for a specific transaction (durant un enregistrement précis)
  const handleOpenTransactionInvoice = (tx: DisplayTransaction) => {
    setActiveInvoiceData({
      ...(tx.id ? { transactionId: tx.id } : {}),
      invoiceNumber: `INV-${tx.id ? String(tx.id).slice(0, 8).toUpperCase() : '2026-0841'}`,
      date: tx.date || new Date().toLocaleDateString('fr-FR'),
      churchName: church?.name || 'Votre Église',
      ...(church?.logoUrl ? { churchLogoUrl: church.logoUrl } : {}),
      churchDenomination: 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: tx.branchName || 'Paroisse',
      recipientName:
        tx.beneficiary ||
        (tx.type === 'INCOME'
          ? 'Culte Dominical & Assemblée'
          : 'Prestataire / Fournisseur Paroissial'),
      recipientAddress: '',
      recipientContact: '',
      items: [
        {
          no: '01',
          description: tx.categoryName || 'Opération',
          subDescription:
            tx.notes ||
            (tx.type === 'INCOME'
              ? 'Collecte et libéralités dominicales approuvées'
              : 'Règlement de charge avec pièce comptable'),
          amount: tx.amount,
        },
      ],
      total: tx.amount,
      paymentMethod: tx.paymentMethod
        ? (PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod)
        : formatPaymentMethods(church?.paymentMethods),
      ...(church?.paymentDetails ? { paymentDetails: church.paymentDetails } : {}),
      terms:
        'Certifié conforme aux écritures du grand livre de la communauté. Pièce justificative officielle.',
      ...(church?.phone ? { phone: church.phone } : {}),
      ...(church?.email ? { email: church.email } : {}),
      currency: church?.currency,
    });
  };

  // Open consolidated invoice for the active period (sur une période)
  const handleOpenPeriodInvoice = () => {
    setActiveInvoiceData({
      invoiceNumber: `PER-${new Date().getFullYear()}-${periodFilter}`,
      date: new Date().toLocaleDateString('fr-FR'),
      churchName: church?.name || 'Votre Église',
      ...(church?.logoUrl ? { churchLogoUrl: church.logoUrl } : {}),
      churchDenomination: 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: activeBranchLabel,
      recipientName: `Conseil Paroissial & Commission des Finances`,
      recipientAddress: '',
      recipientContact: '',
      items: [
        {
          no: '01',
          description: 'Dîmes & Offrandes ordinaires dominicales',
          subDescription: `Total des collectes de culte (${periodFilter === 'MONTH' ? 'Ce mois' : periodFilter === 'SUNDAY' ? 'Dernier culte' : 'Trimestre'})`,
          amount: activeIncomes,
        },
        {
          no: '02',
          description: 'Décaissements autorisés & Charges courantes',
          subDescription: 'Factures d’électricité, loyers de sanctuaire et charges acquittées',
          amount: activeExpenses,
        },
      ],
      total: activeIncomes,
      paymentMethod: (() => {
        // A period invoice covers many transactions — show the method(s)
        // actually used, not a static church-wide default that may not
        // match what was really recorded.
        const used = Array.from(
          new Set(transactions.map((t) => t.paymentMethod).filter((m): m is string => !!m)),
        );
        return used.length > 0
          ? used.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ')
          : formatPaymentMethods(church?.paymentMethods);
      })(),
      ...(church?.paymentDetails ? { paymentDetails: church.paymentDetails } : {}),
      terms:
        'Synthèse officielle des opérations financières de la période certifiée par la trésorerie.',
      ...(church?.phone ? { phone: church.phone } : {}),
      ...(church?.email ? { email: church.email } : {}),
    });
  };

  const displayTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (txFilter === 'INCOME') return tx.type === 'INCOME';
        if (txFilter === 'EXPENSE') return tx.type === 'EXPENSE';
        return true;
      })
      .map((tx) => ({
        id: tx.id,
        type: tx.type,
        categoryName: tx.category?.name || 'Général',
        branchName: tx.branch?.name || 'Paroisse',
        amount: tx.amount,
        date: new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        time: new Date(tx.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        beneficiary: tx.beneficiary,
        notes: tx.notes,
        receiptUrl: tx.receiptUrl,
        authorName: tx.author?.name || tx.author?.email?.split('@')[0] || 'Trésorier',
        paymentMethod: tx.paymentMethod,
      }));
  }, [transactions, txFilter]);

  const reserveDiff = activeBalance - activeThreshold;
  const isLowBalance = reserveDiff < 0;
  const reserveHealthRatio = Math.min(
    Math.round((activeBalance / (activeThreshold || 1)) * 100),
    100,
  );

  const pendingTotalAmount = activePendingRecurrents.reduce((acc, r) => acc + r.amount, 0);
  const netProjected = activeBalance - pendingTotalAmount;

  // Show the skeleton for as long as we don't have real numbers to paint —
  // otherwise the balance card flashes "0 FCFA" for a beat before the real
  // figures land, which reads as a bug more than a loading state.
  const isPageLoading = authLoading || branchLoading || (!!church && dataLoading);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-emerald-50/50 text-stone-900 pb-24 md:pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AppHeader />
      <AppNav />

      {branchError && !church && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-center justify-between shadow-xs">
            <span>Impossible de charger votre église pour le moment. {branchError}</span>
            <button
              onClick={() => void refreshBranches()}
              className="text-red-700 hover:text-red-950 font-bold ml-4 underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-center justify-between shadow-xs">
            <span>{loadError}</span>
            <button
              onClick={() => setLoadError(null)}
              className="text-red-700 hover:text-red-950 font-bold ml-4"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {branchActionMessage && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-700" />
              <span>{branchActionMessage}</span>
            </div>
            <button
              onClick={() => setBranchActionMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-4"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6 sm:space-y-8">
        {isPageLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ── 1. GABONESE SANCTUARY HERO ACCOUNT CARD (Rich Gradient, Pro Effects, Branch Switcher) ── */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/30 border border-emerald-800/80">
              {/* Decorative glow blobs — depth without literal texture/noise.
              -z-10 (not the default z-auto) so they stay behind the normal-flow
              content below, since an absolutely positioned box otherwise
              paints above static siblings regardless of DOM order. */}
              <div className="pointer-events-none absolute -z-10 -top-24 -right-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -z-10 -bottom-32 -left-10 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

              {/* Top Bar inside Card */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-800/80 pb-5">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-900/90 border border-emerald-600/50 text-emerald-100 shadow-md">
                    {church?.logoUrl ? (
                      <img src={church.logoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ChurchIcon className="h-6 w-6 text-emerald-200" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold tracking-wider text-emerald-100 uppercase">
                        {church?.name || 'Communauté Chrétienne'}
                      </h2>
                      <Link
                        href="/soutenir"
                        className="inline-flex items-center gap-1 rounded-md bg-rose-400/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-400/40 hover:bg-rose-400/30 transition-colors"
                      >
                        Soutenir <span aria-hidden="true">♥</span>
                      </Link>
                    </div>

                    {/* Interactive Branch Switcher Dropdown & Quick Add Button */}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900/90 px-3 py-1.5 text-xs font-semibold text-emerald-100 border border-emerald-700/80 shadow-xs transition-all cursor-pointer"
                        >
                          <BuildingBranchIcon className="h-3.5 w-3.5 text-emerald-300" />
                          <span>{activeBranchLabel}</span>
                          <ChevronDownIcon className="h-3.5 w-3.5 text-emerald-300 transition-transform" />
                        </button>

                        {/* Branch Switcher Dropdown Menu */}
                        {isBranchDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setIsBranchDropdownOpen(false)}
                            />
                            <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-emerald-700/60 bg-emerald-950 p-2 shadow-2xl z-40 text-stone-100 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                                Sélectionner une paroisse
                              </div>

                              <div className="space-y-1 my-1">
                                {/* Option: Vue Consolidée */}
                                <button
                                  type="button"
                                  onClick={() => handleSwitchBranch('CONSOLIDATED')}
                                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors text-left ${
                                    isConsolidated
                                      ? 'bg-emerald-800 text-white border border-emerald-600'
                                      : 'hover:bg-emerald-900/80 text-emerald-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                                    <span>Vue Consolidée (Toutes)</span>
                                  </div>
                                  <span className="text-[11px] text-amber-300 font-mono font-bold">
                                    {(
                                      branches.reduce((s, b) => s + b.currentBalance, 0) / 1000
                                    ).toFixed(0)}
                                    k F
                                  </span>
                                </button>

                                {/* List of individual branches */}
                                {availableBranches.map((b) => {
                                  const isSelected = !isConsolidated && currentBranch?.id === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => handleSwitchBranch(b.id)}
                                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left ${
                                        isSelected
                                          ? 'bg-emerald-800 text-white border border-emerald-600 font-bold'
                                          : 'hover:bg-emerald-900/80 text-emerald-100'
                                      }`}
                                    >
                                      <div>
                                        <p className="truncate max-w-[160px]">{b.name}</p>
                                        <p className="text-[10px] text-emerald-400/70">{b.city}</p>
                                      </div>
                                      <span className="text-[11px] font-mono text-emerald-300">
                                        {(b.balance / 1000).toFixed(0)}k F
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {church?.isPastor && (
                                <div className="border-t border-emerald-800/80 pt-1 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsBranchDropdownOpen(false);
                                      setIsAddBranchModalOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 py-2 text-xs font-bold text-emerald-100 border border-emerald-600/40 transition-colors cursor-pointer"
                                  >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                    <span>Ajouter une annexe</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Period Filter Pills */}
                <div className="flex items-center gap-1 self-start lg:self-auto rounded-xl bg-emerald-950/90 p-1 border border-emerald-800 text-xs shadow-xs">
                  <button
                    onClick={() => setPeriodFilter('MONTH')}
                    className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                      periodFilter === 'MONTH'
                        ? 'bg-white text-emerald-950 shadow-xs font-bold'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Ce mois
                  </button>
                  <button
                    onClick={() => setPeriodFilter('SUNDAY')}
                    className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                      periodFilter === 'SUNDAY'
                        ? 'bg-white text-emerald-950 shadow-xs font-bold'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Dernier culte
                  </button>
                  <button
                    onClick={() => setPeriodFilter('QUARTER')}
                    className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                      periodFilter === 'QUARTER'
                        ? 'bg-white text-emerald-950 shadow-xs font-bold'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Trimestre
                  </button>
                </div>
              </div>

              {/* Card Middle: Main Balance */}
              <div className="py-6 sm:py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200 tracking-wider uppercase">
                    <span>
                      {t('dashboard.available_balance', 'Solde Net de Trésorerie Disponible')}
                    </span>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </div>

                  <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                    <span className="font-mono tabular-nums text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                      {activeBalance.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-amber-300 font-serif">
                      {currency}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/70 px-2.5 py-1 font-medium text-emerald-200 border border-emerald-700/60 shadow-xs">
                      <TrendingUpIcon className="h-3.5 w-3.5 text-emerald-300" />
                      <span className="text-emerald-300 font-bold">+23.5%</span>
                      <span>vs mois précédent</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/70 px-2.5 py-1 text-stone-200 border border-emerald-700/60 shadow-xs">
                      <ShieldCheckIcon className="h-3.5 w-3.5 text-amber-300" />
                      <span>Seuil de réserve :</span>
                      <span className="font-mono tabular-nums font-bold text-white">
                        {activeThreshold.toLocaleString('fr-FR')} {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Incomes & Expenses Compact Box */}
                <div className="flex items-center gap-5 bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800 shadow-md">
                  <div className="border-r border-emerald-800/80 pr-5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-200/90">
                      <TrendingUpIcon className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t('dashboard.incomes_this_month', 'Entrées du mois')}</span>
                    </div>
                    <p className="mt-1 text-base sm:text-lg font-mono tabular-nums font-bold text-emerald-300">
                      +{activeIncomes.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-normal">{currencyShort}</span>
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-300">
                      <TrendingDownIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span>{t('dashboard.expenses_this_month', 'Dépenses du mois')}</span>
                    </div>
                    <p className="mt-1 text-base sm:text-lg font-mono tabular-nums font-bold text-stone-200">
                      -{activeExpenses.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-normal">{currencyShort}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Bottom: 4 Quick Action Buttons (Rich Themed Gradients, Elevation & Shadow Effects) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-emerald-800/80">
                {/* Action 1: Saisie Culte — vibrant emerald (brand primary / inflow) */}
                <Link
                  href="/transactions/incomes"
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3.5 border border-emerald-300/40 hover:from-emerald-400 hover:to-emerald-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/40 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md shadow-emerald-950/20"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white font-bold ring-1 ring-white/30 group-hover:scale-105 group-hover:bg-white/25 transition-all">
                    <CoinsHandIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">
                      + {t('dashboard.action.new_income', 'Saisie Culte')}
                    </p>
                    <p className="text-[10px] text-emerald-50/90">Dîmes & Offrandes</p>
                  </div>
                </Link>

                {/* Action 2: Décaissement — rose/red (outflow signal) */}
                <Link
                  href="/transactions/expenses"
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-3.5 border border-rose-300/40 hover:from-rose-400 hover:to-red-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-900/40 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md shadow-rose-950/20"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white font-bold ring-1 ring-white/30 group-hover:scale-105 group-hover:bg-white/25 transition-all">
                    <ReceiptTextIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">
                      - {t('dashboard.action.new_expense', 'Décaissement')}
                    </p>
                    <p className="text-[10px] text-rose-50/90">Dépense avec Reçu</p>
                  </div>
                </Link>

                {/* Action 3: Charges Fixes — blue/indigo (scheduled/structural) */}
                <Link
                  href="/recurrent-expenses/validation"
                  className="group relative flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 border border-blue-300/40 hover:from-blue-400 hover:to-indigo-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/40 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md shadow-indigo-950/20"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white font-bold ring-1 ring-white/30 group-hover:scale-105 group-hover:bg-white/25 transition-all">
                    <LightningBoltIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white">
                        {t('dashboard.action.recurrent', 'Charges Fixes')}
                      </p>
                      {activePendingRecurrents.length > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-700 shadow-xs">
                          {activePendingRecurrents.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-50/90">Loyer, Électricité, Eau</p>
                  </div>
                </Link>

                {/* Action 4: Rapport A4 — neutral slate (documents, not a transaction) */}
                <Link
                  href="/reports"
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 p-3.5 border border-slate-400/40 hover:from-slate-500 hover:to-slate-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/40 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md shadow-slate-950/20"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white font-bold ring-1 ring-white/30 group-hover:scale-105 group-hover:bg-white/25 transition-all">
                    <DocumentReportIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">
                      {t('dashboard.action.report_a4', 'Rapport A4')}
                    </p>
                    <p className="text-[10px] text-slate-50/80">Homologué Culte</p>
                  </div>
                </Link>
              </div>
            </section>

            {/* ── 2. METRICS & FINANCIAL HEALTH GAUGES (Clean 2xl Rounded Cards, Solid Borders) ── */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Indicateur de Santé & Seuil de Réserve */}
              <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-emerald-800" />
                    <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                      Santé & Réserve
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                      isLowBalance
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <span>{isLowBalance ? 'Alerte Seuil' : 'Trésorerie Saine'}</span>
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-stone-500">Marge au-dessus du seuil</p>
                    <span className="font-mono tabular-nums text-lg font-bold text-emerald-950">
                      {reserveDiff > 0
                        ? `+${reserveDiff.toLocaleString('fr-FR')} ${currency}`
                        : `${reserveDiff.toLocaleString('fr-FR')} ${currency}`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2.5 w-full rounded-full bg-stone-100 overflow-hidden border border-stone-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isLowBalance ? 'bg-red-600' : 'bg-emerald-700'
                      }`}
                      style={{ width: `${Math.max(8, Math.min(100, reserveHealthRatio))}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[11px] text-stone-400">
                    <span>0 {currencyShort}</span>
                    <span className="font-mono tabular-nums">
                      Seuil : {activeThreshold.toLocaleString('fr-FR')} {currencyShort}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-800">
                      {(activeThreshold * 2).toLocaleString('fr-FR')} {currencyShort}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-stone-50 p-3 border border-stone-200 text-xs text-stone-600 leading-relaxed">
                  <strong className="text-stone-800">Note de gestion :</strong>{' '}
                  {isLowBalance
                    ? 'Le solde est critique. Différez tout achat non prioritaire jusqu’au prochain culte.'
                    : 'La caisse couvre les charges courantes de la paroisse avec une réserve saine.'}
                </div>
              </div>

              {/* Card 2: Projection de Fin de Mois */}
              <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-blue-50/50 p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClockIcon className="h-4 w-4 text-stone-600" />
                    <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                      Projection Fin de Mois
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-stone-500">Charges déduites</span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-stone-500">Solde estimé au 30 du mois</p>
                  <p className="mt-1 font-mono tabular-nums text-3xl font-bold text-stone-900">
                    {netProjected.toLocaleString('fr-FR')}{' '}
                    <span className="text-sm font-sans font-normal text-stone-500">{currency}</span>
                  </p>

                  <div className="mt-3 space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                    <div className="flex justify-between">
                      <span>Solde en caisse :</span>
                      <span className="font-mono tabular-nums font-semibold text-stone-800">
                        {activeBalance.toLocaleString('fr-FR')} {currencyShort}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-800">
                      <span>Charges récurrentes prévues :</span>
                      <span className="font-mono tabular-nums font-semibold">
                        -{pendingTotalAmount.toLocaleString('fr-FR')} {currencyShort}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-900 pt-1 border-t border-dashed border-stone-200">
                      <span>Marge nette prévisionnelle :</span>
                      <span className="font-mono tabular-nums">
                        {netProjected.toLocaleString('fr-FR')} {currencyShort}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-1">
                  <Link
                    href="/recurrent-expenses"
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1"
                  >
                    <span>Planning des charges récurrentes</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Switcher Paroisses */}
              <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-violet-50/50 p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BuildingBranchIcon className="h-4 w-4 text-stone-600" />
                      <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                        Paroisses & Annexes
                      </span>
                    </div>
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                      {branches.length} Lieux
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => selectBranch('CONSOLIDATED')}
                      className={`w-full text-left rounded-lg p-2.5 text-xs transition-colors flex items-center justify-between border ${
                        isConsolidated
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ChurchIcon className="h-4 w-4 text-emerald-800" />
                        <span>Vue Consolidée (Toutes Paroisses)</span>
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-800">
                        {branches
                          .reduce((acc, b) => acc + b.currentBalance, 0)
                          .toLocaleString('fr-FR')}{' '}
                        {currencyShort}
                      </span>
                    </button>

                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => selectBranch(b.id)}
                        className={`w-full text-left rounded-lg p-2.5 text-xs transition-colors flex items-center justify-between border ${
                          !isConsolidated && currentBranch?.id === b.id
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span className="truncate max-w-[180px] flex items-center gap-1.5">
                          <BuildingBranchIcon className="h-3.5 w-3.5 text-stone-400" />
                          <span>{b.name}</span>
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-stone-900">
                          {b.currentBalance.toLocaleString('fr-FR')} {currencyShort}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 mt-3">
                  <Link
                    href="/settings/branches"
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center justify-between"
                  >
                    <span>Gérer les annexes de l’église</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </section>

            {/* ── 3. OFFERINGS BREAKDOWN & RECURRING EXPENSES CENTER ── */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Interactive Breakdown of Worship Offerings (7 cols) */}
              <div className="lg:col-span-7 relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-emerald-50/40 p-6 sm:p-7 shadow-xs hover:shadow-lg transition-shadow duration-300">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-emerald-950">
                      Répartition des Entrées de Culte
                    </h3>
                    <p className="text-xs text-stone-500">
                      Ventilation canonique des dîmes, offrandes et souscriptions spéciales
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 self-start">
                    Total : {activeIncomes.toLocaleString('fr-FR')} {currency}
                  </span>
                </div>

                {incomeBreakdown.length === 0 ? (
                  <div className="mt-6 py-8 text-center text-xs text-stone-400">
                    <CoinsHandIcon className="h-7 w-7 mx-auto text-stone-300 mb-2" />
                    <p className="font-semibold text-stone-600">
                      Aucune entrée enregistrée pour l’instant.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Visual Multi-Segment Bar */}
                    <div className="mt-6">
                      <div className="h-3 w-full rounded-full overflow-hidden flex bg-stone-100 border border-stone-200">
                        {incomeBreakdown.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                            title={`${item.category}: ${item.amount.toLocaleString('fr-FR')} ${currency} (${item.percentage}%)`}
                            className="h-full transition-all duration-500"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Breakdown Legend Grid with Vector SVG Icons */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {incomeBreakdown.map((item, idx) => {
                        const IconComponent =
                          idx === 0
                            ? TrendingUpIcon
                            : idx === 1
                              ? CoinsHandIcon
                              : idx === 2
                                ? GiftIcon
                                : HeartHandIcon;
                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-700 shadow-2xs">
                                <IconComponent className="h-4 w-4" style={{ color: item.color }} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-stone-900">{item.category}</p>
                                <p className="text-[11px] text-stone-500">
                                  {item.percentage}% de la collecte
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-mono tabular-nums font-bold text-emerald-950">
                                {item.amount.toLocaleString('fr-FR')} {currencyShort}
                              </p>
                              <div
                                className="h-1.5 w-7 rounded-full ml-auto mt-1"
                                style={{ backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3 text-xs text-amber-950">
                  <ShieldCheckIcon className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Protocole de Transparence Goshen :</strong> Le
                    dépouillement et le comptage dominical sont obligatoirement contresignés par
                    deux personnes avant la clôture du registre.
                  </div>
                </div>
              </div>

              {/* Right: Imminent Fixed Charges (5 cols) */}
              <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-rose-50/40 p-6 sm:p-7 shadow-xs hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 to-red-500" />
                <div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-stone-900">
                        Charges Fixes à Valider
                      </h3>
                      <p className="text-xs text-stone-500">
                        Loyer du temple, factures d’énergie et charges
                      </p>
                    </div>
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 border border-red-200">
                      {activePendingRecurrents.length} en attente
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {activePendingRecurrents.map((rec) => (
                      <div
                        key={rec.id}
                        className={`rounded-xl border p-3.5 transition-colors ${
                          rec.urgent
                            ? 'border-amber-300 bg-amber-50/70'
                            : 'border-stone-200 bg-stone-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {rec.urgent && (
                                <span className="rounded bg-red-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                                  Imminent
                                </span>
                              )}
                              <p className="text-xs font-bold text-stone-900">{rec.name}</p>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {rec.branchName} &bull; {rec.category}
                            </p>
                          </div>
                          <span className="font-mono tabular-nums text-sm font-bold text-emerald-950 whitespace-nowrap">
                            {rec.amount.toLocaleString('fr-FR')} {currencyShort}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-200/80 text-xs">
                          <span className="text-[11px] text-stone-500">
                            Échéance :{' '}
                            <strong className="text-stone-700">
                              {new Date(rec.dueDate).toLocaleDateString('fr-FR')}
                            </strong>
                          </span>
                          <Link
                            href="/recurrent-expenses/validation"
                            className="rounded-md bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                          >
                            <span>Valider</span>
                            <ArrowRightIcon className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100">
                  <Link
                    href="/recurrent-expenses/validation"
                    className="block w-full text-center rounded-lg bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors shadow-xs"
                  >
                    Ouvrir le Centre de Décaissement en 1 Clic
                  </Link>
                </div>
              </div>
            </section>

            {/* ── 4. MODERN TRANSACTION HISTORY (Clean Professional List with Pro Vector Icons) ── */}
            <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    Journal des Écritures Comptables
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Mouvements de caisse horodatés et pièces justificatives
                  </p>
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    onClick={() => setTxFilter('ALL')}
                    className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
                      txFilter === 'ALL'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Toutes ({displayTransactions.length})
                  </button>
                  <button
                    onClick={() => setTxFilter('INCOME')}
                    className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
                      txFilter === 'INCOME'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    + Entrées Cultes
                  </button>
                  <button
                    onClick={() => setTxFilter('EXPENSE')}
                    className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
                      txFilter === 'EXPENSE'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    - Dépenses & Reçus
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="mt-6 divide-y divide-stone-100">
                {displayTransactions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400">
                    <DocumentReportIcon className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                    <p className="font-semibold text-stone-600">
                      Aucune écriture comptable enregistrée.
                    </p>
                    <Link
                      href="/transactions/incomes"
                      className="mt-3 inline-block text-emerald-800 font-bold underline"
                    >
                      Enregistrer votre première entrée
                    </Link>
                  </div>
                ) : (
                  displayTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 rounded-xl px-2.5 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold shadow-2xs ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-100 text-stone-800 border border-stone-200'
                          }`}
                        >
                          {tx.type === 'INCOME' ? (
                            <CoinsHandIcon className="h-5 w-5 text-emerald-800" />
                          ) : (
                            <ReceiptTextIcon className="h-5 w-5 text-stone-700" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-stone-900">{tx.categoryName}</p>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                tx.type === 'INCOME'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-stone-100 text-stone-800 border border-stone-200'
                              }`}
                            >
                              {tx.type === 'INCOME' ? 'CULTE / ENTRÉE' : 'DÉCAISSEMENT'}
                            </span>
                            <span className="text-[10px] font-medium text-stone-600 bg-stone-100 rounded px-1.5 py-0.2">
                              {tx.branchName}
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-500 mt-1">
                            {tx.notes || tx.beneficiary || 'Écriture validée'}
                          </p>

                          <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                            <span>
                              {tx.date} à {tx.time}
                            </span>
                            <span>&bull;</span>
                            <span>Saisi par {tx.authorName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Amount & Receipt Trigger */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-center pl-14 sm:pl-0">
                        <div className="text-right">
                          <p
                            className={`font-mono tabular-nums text-base sm:text-lg font-bold ${
                              tx.type === 'INCOME' ? 'text-emerald-800' : 'text-stone-900'
                            }`}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'}
                            {tx.amount.toLocaleString('fr-FR')}{' '}
                            <span className="text-xs font-sans font-normal text-stone-500">
                              {currency}
                            </span>
                          </p>
                        </div>

                        {/* Action buttons: Facture & Reçu */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenTransactionInvoice(tx)}
                            className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 hover:bg-stone-50 shadow-2xs transition-colors flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-emerald-950 cursor-pointer"
                            title="Prévisualiser, imprimer ou télécharger la facture officielle de cette opération"
                          >
                            <DocumentReportIcon className="h-3.5 w-3.5 text-emerald-800" />
                            <span className="hidden sm:inline text-[11px]">Facture</span>
                          </button>

                          {tx.receiptUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptUrl(tx.receiptUrl)}
                              className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 hover:bg-stone-50 shadow-2xs transition-colors flex items-center gap-1 text-xs font-semibold text-emerald-800 cursor-pointer"
                              title="Voir la photo du justificatif"
                            >
                              <CameraIcon className="h-3.5 w-3.5 text-emerald-800" />
                              <span className="hidden sm:inline text-[11px]">Reçu</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-stone-500">
                  Affichage des écritures comptables certifiées de l'assemblée
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenPeriodInvoice}
                    className="font-bold text-[#e11d48] hover:text-[#be123c] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <DocumentReportIcon className="h-3.5 w-3.5" />
                    <span>Facture récapitulative de la période</span>
                  </button>
                  <span className="text-stone-300 hidden sm:inline">|</span>
                  <Link
                    href="/reports"
                    className="font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1"
                  >
                    <span>Éditer le rapport dominical officiel</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── 5. RECEIPT PHOTO MODAL (Solid, No Blur) ── */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-lg w-full overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <div className="flex items-center gap-2">
                <CameraIcon className="h-4 w-4 text-emerald-800" />
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  Justificatif Comptable Numérique
                </h4>
              </div>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-4 bg-stone-950 flex items-center justify-center min-h-[280px]">
              <img
                src={selectedReceiptUrl}
                alt="Justificatif de dépense"
                className="max-h-[65vh] rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="p-3.5 bg-white flex justify-between items-center text-xs border-t border-stone-200">
              <span className="text-stone-500">Pièce archivée sur Goshen</span>
              <a
                href={selectedReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-emerald-800 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
              >
                Télécharger l'original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL AJOUT D'ANNEXE RAPIDE ── */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
          <div className="relative max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <BuildingBranchIcon className="h-5 w-5 text-emerald-800" />
                <h3 className="font-serif text-base font-bold text-stone-900">
                  Ajouter une Nouvelle Annexe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nom de l'annexe ou paroisse *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Annexe Port-Gentil (Grand Village)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Ville / Commune</label>
                <input
                  type="text"
                  placeholder="Ex: Port-Gentil"
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Solde initial ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={newBranchBalance}
                    onChange={(e) => setNewBranchBalance(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Seuil de réserve ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={newBranchThreshold}
                    onChange={(e) => setNewBranchThreshold(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBranch || !newBranchName.trim()}
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {isCreatingBranch ? 'Création…' : 'Enregistrer l’annexe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. INVOICE / REÇU MODAL (EXACT IMAGE REPRODUCTION) ── */}
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
