'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { GOSHEN_MOCK_DATA } from '@/lib/mock-church-data';
import { InvoiceModal, type InvoiceData } from '@/components/invoices/InvoiceModal';
import {
  ChurchIcon,
  CoinsHandIcon,
  ReceiptTextIcon,
  LightningBoltIcon,
  DocumentReportIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  BuildingBranchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CameraIcon,
  CalendarClockIcon,
  WalletIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CrossIcon,
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
  paymentMethod?: string;
  receiptUrl: string | null;
  category: { name: string };
  branch: { name: string };
  author: { name: string | null; email: string };
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    church,
    branches,
    currentBranch,
    isConsolidated,
    selectBranch,
    refreshBranches,
    loading: branchLoading,
  } = useBranch();

  // Mode démo toggle
  const [useMockData, setUseMockData] = useState<boolean>(false);
  const [isSeedingDb, setIsSeedingDb] = useState<boolean>(false);
  const [seedSuccessMessage, setSeedSuccessMessage] = useState<string | null>(null);

  // Real data states
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [pendingRecurrents, setPendingRecurrents] = useState<PendingExecution[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // UI interaction states
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [activeInvoiceData, setActiveInvoiceData] = useState<InvoiceData | null>(null);
  const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'MONTH' | 'SUNDAY' | 'QUARTER'>('MONTH');

  // Branch switcher & Modal states
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState<boolean>(false);
  const [mockBranches, setMockBranches] = useState(GOSHEN_MOCK_DATA.branches);
  const [selectedMockBranchId, setSelectedMockBranchId] = useState<string | 'CONSOLIDATED'>('CONSOLIDATED');

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
    try {
      const branchParam = isConsolidated ? 'CONSOLIDATED' : currentBranch?.id;
      const [txRes, recRes] = await Promise.all([
        api<{
          transactions: TransactionItem[];
          summary: { totalIncome: number; totalExpense: number };
        }>(`/api/transactions?branchId=${branchParam}&limit=12`),
        api<{ pendingExecutions: PendingExecution[] }>(
          `/api/recurrent-expenses?branchId=${branchParam}`
        ),
      ]);

      setTransactions(txRes.transactions || []);
      setTotalIncome(txRes.summary?.totalIncome || 0);
      setTotalExpense(txRes.summary?.totalExpense || 0);
      setPendingRecurrents(recRes.pendingExecutions || []);

      if ((!txRes.transactions || txRes.transactions.length === 0) && txRes.summary?.totalIncome === 0) {
        setUseMockData(true);
      }
    } catch {
      setUseMockData(true);
    } finally {
      setDataLoading(false);
    }
  }, [church, isConsolidated, currentBranch]);

  useEffect(() => {
    if (!authLoading && !user) {
      setUseMockData(true);
      setDataLoading(false);
      return;
    }
    if (!authLoading && !branchLoading && user && !church) {
      router.replace('/onboarding');
      return;
    }
    if (church) {
      void fetchDashboardData();
    }
  }, [authLoading, branchLoading, user, church, router, fetchDashboardData]);

  const handleSeedDatabase = async () => {
    setIsSeedingDb(true);
    setSeedSuccessMessage(null);
    try {
      const res = await api<{ success: boolean; message: string }>('/api/church/demo-seed', {
        method: 'POST',
      });
      setSeedSuccessMessage(res.message || 'Données de démonstration injectées en base.');
      setUseMockData(false);
      await refreshBranches();
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erreur lors de l’injection des données.');
    } finally {
      setIsSeedingDb(false);
    }
  };

  // Branch switcher handler
  const handleSwitchBranch = (id: string | 'CONSOLIDATED') => {
    if (useMockData) {
      setSelectedMockBranchId(id);
    } else {
      selectBranch(id);
    }
    setIsBranchDropdownOpen(false);
  };

  // Create branch handler
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setIsCreatingBranch(true);
    try {
      if (useMockData) {
        const newMock = {
          id: `branch-custom-${Date.now()}`,
          name: newBranchName.trim(),
          location: newBranchCity.trim() || 'Gabon',
          isMain: false,
          currentBalance: Number(newBranchBalance) || 0,
          lowBalanceThreshold: Number(newBranchThreshold) || 200000,
        };
        setMockBranches((prev) => [...prev, newMock]);
        setSelectedMockBranchId(newMock.id);
        setBranchActionMessage(`Nouvelle annexe "${newMock.name}" créée et activée.`);
      } else {
        await api('/api/church/branches', {
          method: 'POST',
          body: JSON.stringify({
            name: newBranchName.trim(),
            city: newBranchCity.trim() || null,
            lowBalanceThreshold: Number(newBranchThreshold) || 200000,
            initialBalance: Number(newBranchBalance) || 0,
          }),
        });
        await refreshBranches();
        setBranchActionMessage(`Nouvelle annexe "${newBranchName.trim()}" enregistrée.`);
      }

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
    if (useMockData) {
      return mockBranches.map((b) => ({
        id: b.id,
        name: b.name,
        city: b.location,
        balance: b.currentBalance,
        threshold: b.lowBalanceThreshold,
        isMain: b.isMain,
      }));
    }
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city || 'Gabon',
      balance: b.currentBalance,
      threshold: b.lowBalanceThreshold,
      isMain: b.isMain,
    }));
  }, [useMockData, mockBranches, branches]);

  const activeBranchLabel = useMemo(() => {
    if (useMockData) {
      if (selectedMockBranchId === 'CONSOLIDATED') {
        return 'Vue Consolidée (Toutes les Paroisses)';
      }
      const b = mockBranches.find((item) => item.id === selectedMockBranchId);
      return b ? b.name : 'Paroisse Inconnue';
    }
    if (isConsolidated) return 'Vue Consolidée (Toutes les Paroisses)';
    return currentBranch?.name || 'Paroisse Principale';
  }, [useMockData, selectedMockBranchId, mockBranches, isConsolidated, currentBranch]);

  const activeBalance = useMemo(() => {
    if (useMockData) {
      if (selectedMockBranchId === 'CONSOLIDATED') {
        return mockBranches.reduce((acc, b) => acc + b.currentBalance, 0);
      }
      const b = mockBranches.find((item) => item.id === selectedMockBranchId);
      return b ? b.currentBalance : 0;
    }
    return isConsolidated
      ? branches.reduce((acc, b) => acc + b.currentBalance, 0)
      : currentBranch?.currentBalance || 0;
  }, [useMockData, selectedMockBranchId, mockBranches, isConsolidated, currentBranch, branches]);

  const activeThreshold = useMemo(() => {
    if (useMockData) {
      if (selectedMockBranchId === 'CONSOLIDATED') {
        return mockBranches.reduce((acc, b) => acc + b.lowBalanceThreshold, 0);
      }
      const b = mockBranches.find((item) => item.id === selectedMockBranchId);
      return b ? b.lowBalanceThreshold : 100000;
    }
    return isConsolidated
      ? branches.reduce((acc, b) => acc + b.lowBalanceThreshold, 0)
      : currentBranch?.lowBalanceThreshold || 100000;
  }, [useMockData, selectedMockBranchId, mockBranches, isConsolidated, currentBranch, branches]);

  const activeIncomes = useMemo(() => {
    if (useMockData) return GOSHEN_MOCK_DATA.summary.monthlyIncome;
    return totalIncome;
  }, [useMockData, totalIncome]);

  const activeExpenses = useMemo(() => {
    if (useMockData) return GOSHEN_MOCK_DATA.summary.monthlyExpense;
    return totalExpense;
  }, [useMockData, totalExpense]);

  const activePendingRecurrents = useMemo(() => {
    if (useMockData) {
      return GOSHEN_MOCK_DATA.pendingRecurrents;
    }
    return pendingRecurrents.map((r) => ({
      id: r.id,
      name: r.recurringExpense.name,
      branchName: r.recurringExpense.branch.name,
      category: r.recurringExpense.category.name,
      amount: r.amount,
      dueDate: r.dueDate,
      urgent: new Date(r.dueDate).getTime() - Date.now() < 3 * 24 * 3600 * 1000,
    }));
  }, [useMockData, pendingRecurrents]);

  // Open invoice for a specific transaction (durant un enregistrement précis)
  const handleOpenTransactionInvoice = (tx: any) => {
    setActiveInvoiceData({
      invoiceNumber: `INV-${tx.id ? String(tx.id).slice(0, 8).toUpperCase() : '2026-0841'}`,
      date: tx.date || new Date().toLocaleDateString('fr-FR'),
      churchName: church?.name || 'COMMUNAUTÉ ÉVANGÉLIQUE DE LA GRÂCE',
      churchDenomination: 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: `${tx.branchName || 'Paroisse Centrale'}, Libreville, Gabon`,
      recipientName: tx.beneficiary || (tx.type === 'INCOME' ? 'Culte Dominical & Assemblée' : 'Prestataire / Fournisseur Paroissial'),
      recipientAddress: 'Libreville, Gabon',
      recipientContact: 'finance@eglise.ga',
      items: [
        {
          no: '01',
          description: tx.categoryName,
          subDescription: tx.notes || (tx.type === 'INCOME' ? 'Collecte et libéralités dominicales approuvées' : 'Règlement de charge avec pièce comptable'),
          price: tx.amount,
          qty: '1',
          total: tx.amount,
        },
      ],
      subTotal: tx.amount,
      tax: 0,
      discount: 0,
      grandTotal: tx.amount,
      paymentMethod: tx.paymentMethod ? String(tx.paymentMethod).replace('_', ' ') : 'Caisse Espèces Libreville',
      terms: 'Certifié conforme aux écritures du grand livre de la communauté. Pièce justificative officielle.',
      signatoryName: tx.authorName || 'Steven Joe',
      signatoryRole: 'Accounting Manager / Trésorier de Caisse',
    });
  };

  // Open consolidated invoice for the active period (sur une période)
  const handleOpenPeriodInvoice = () => {
    setActiveInvoiceData({
      invoiceNumber: `PER-${new Date().getFullYear()}-${periodFilter}`,
      date: new Date().toLocaleDateString('fr-FR'),
      churchName: church?.name || 'COMMUNAUTÉ ÉVANGÉLIQUE DE LA GRÂCE',
      churchDenomination: 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE',
      churchAddress: `${activeBranchLabel}, Gabon`,
      recipientName: `Conseil Paroissial & Commission des Finances`,
      recipientAddress: 'Libreville, République Gabonaise',
      recipientContact: 'contact@eglise.ga',
      items: [
        {
          no: '01',
          description: 'Dîmes & Offrandes ordinaires dominicales',
          subDescription: `Total des collectes de culte (${periodFilter === 'MONTH' ? 'Ce mois' : periodFilter === 'SUNDAY' ? 'Dernier culte' : 'Trimestre'})`,
          price: activeIncomes,
          qty: '1',
          total: activeIncomes,
        },
        {
          no: '02',
          description: 'Décaissements autorisés & Charges courantes',
          subDescription: 'Factures SEEG, loyers de sanctuaire et charges acquittées',
          price: activeExpenses,
          qty: '1',
          total: activeExpenses,
        },
      ],
      subTotal: activeIncomes,
      tax: 0,
      discount: 0,
      grandTotal: activeIncomes,
      paymentMethod: 'Virement UGB / Airtel Money / Caisse Locale',
      terms: 'Synthèse officielle des opérations financières de la période certifiée par la trésorerie.',
      signatoryName: 'Steven Joe',
      signatoryRole: 'Accounting Manager / Trésorier Général',
    });
  };

  const displayTransactions = useMemo(() => {
    if (useMockData) {
      return GOSHEN_MOCK_DATA.transactions.filter((tx) => {
        if (txFilter === 'INCOME') return tx.type === 'INCOME';
        if (txFilter === 'EXPENSE') return tx.type === 'EXPENSE';
        return true;
      });
    }
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
        paymentMethod: (tx.paymentMethod as any) || 'CASH',
        receiptUrl: tx.receiptUrl,
        authorName: tx.author?.name || tx.author?.email?.split('@')[0] || 'Trésorier',
      }));
  }, [useMockData, transactions, txFilter]);

  const reserveDiff = activeBalance - activeThreshold;
  const isLowBalance = reserveDiff < 0;
  const reserveHealthRatio = Math.min(Math.round((activeBalance / (activeThreshold || 1)) * 100), 100);

  const pendingTotalAmount = activePendingRecurrents.reduce((acc, r) => acc + r.amount, 0);
  const netProjected = activeBalance - pendingTotalAmount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-stone-900 pb-24 md:pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AppHeader />
      <AppNav />

      {/* Top Banner: Mode Démo Controls - Clean Solid Box, No Blur, No Sparkles */}
      <div className="border-b border-stone-200 bg-white px-4 py-2.5">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-stone-700">Données affichées :</span>
            {useMockData ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-900 border border-amber-200 flex items-center gap-1">
                <span>●</span> Mode Simulation Actif
              </span>
            ) : (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900 border border-emerald-200 flex items-center gap-1">
                <span>●</span> Données Réelles de l'Église
              </span>
            )}
            <span className="hidden sm:inline text-stone-300">|</span>
            <span className="hidden md:inline text-stone-500">
              {useMockData
                ? 'Simulation interactive (Libreville, Akanda, Owendo)'
                : `${branches.length} paroisse(s) configurée(s)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseMockData(!useMockData)}
              className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              {useMockData ? 'Basculer vers données réelles' : 'Charger la simulation'}
            </button>

            {user && (
              <button
                onClick={handleSeedDatabase}
                disabled={isSeedingDb}
                className="rounded-lg bg-emerald-900 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                title="Enregistrer ces paroisses et écritures dans votre base de données"
              >
                <ChurchIcon className="h-3.5 w-3.5 text-emerald-200" />
                <span>{isSeedingDb ? 'Injection…' : 'Injecter en base réelle'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {seedSuccessMessage && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-700" />
              <span>{seedSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSeedSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-4"
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
        
        {/* ── 1. GABONESE SANCTUARY HERO ACCOUNT CARD (Rich Gradient, Pro Effects, Branch Switcher) ── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#043d2e] to-[#022c22] p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/80">
          
          {/* Top Bar inside Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-800/80 pb-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/90 border border-emerald-600/50 text-emerald-100 shadow-md">
                <ChurchIcon className="h-6 w-6 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold tracking-wider text-emerald-100 uppercase">
                    {useMockData
                      ? GOSHEN_MOCK_DATA.church.name
                      : (church?.name || 'Communauté Chrétienne')}
                  </h2>
                  <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                    {useMockData ? 'CEMAC • GABON' : (church?.plan || 'ESSENTIEL')}
                  </span>
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
                                (useMockData && selectedMockBranchId === 'CONSOLIDATED') || (!useMockData && isConsolidated)
                                  ? 'bg-emerald-800 text-white border border-emerald-600'
                                  : 'hover:bg-emerald-900/80 text-emerald-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                                <span>Vue Consolidée (Toutes)</span>
                              </div>
                              <span className="text-[11px] text-amber-300 font-mono font-bold">
                                {((useMockData
                                  ? mockBranches.reduce((s, b) => s + b.currentBalance, 0)
                                  : branches.reduce((s, b) => s + b.currentBalance, 0)) / 1000).toFixed(0)}k F
                              </span>
                            </button>

                            {/* List of individual branches */}
                            {availableBranches.map((b) => {
                              const isSelected =
                                (useMockData && selectedMockBranchId === b.id) ||
                                (!useMockData && !isConsolidated && currentBranch?.id === b.id);
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
                        </div>
                      </>
                    )}
                  </div>

                  {/* Direct Add Branch button on Card */}
                  <button
                    type="button"
                    onClick={() => setIsAddBranchModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:text-white border border-emerald-700/60 shadow-xs transition-colors cursor-pointer"
                    title="Ajouter une nouvelle annexe ou paroisse"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ajouter une annexe</span>
                  </button>
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
                <span>Solde Net de Trésorerie Disponible</span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>

              <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                <span className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  {activeBalance.toLocaleString('fr-FR')}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-amber-300 font-serif">
                  FCFA
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
                  <span className="font-bold text-white">
                    {activeThreshold.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Incomes & Expenses Compact Box */}
            <div className="flex items-center gap-5 bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800 shadow-md">
              <div className="border-r border-emerald-800/80 pr-5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-200/90">
                  <TrendingUpIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Entrées du mois</span>
                </div>
                <p className="mt-1 text-base sm:text-lg font-bold text-emerald-300">
                  +{activeIncomes.toLocaleString('fr-FR')} <span className="text-xs font-normal">F</span>
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-300">
                  <TrendingDownIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Dépenses du mois</span>
                </div>
                <p className="mt-1 text-base sm:text-lg font-bold text-stone-200">
                  -{activeExpenses.toLocaleString('fr-FR')} <span className="text-xs font-normal">F</span>
                </p>
              </div>
            </div>
          </div>

          {/* Card Bottom: 4 Quick Action Buttons (Rich Themed Gradients, Elevation & Shadow Effects) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-emerald-800/80">
            {/* Action 1: Saisie Culte (Emerald Gradient Backdrop) */}
            <Link
              href="/transactions/incomes"
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-800/90 via-emerald-900 to-emerald-950 p-3.5 border border-emerald-500/40 hover:border-emerald-300 hover:from-emerald-700 hover:to-emerald-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/60 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 text-emerald-950 font-bold shadow-md ring-2 ring-emerald-300/30 group-hover:scale-105 transition-transform">
                <CoinsHandIcon className="h-5 w-5 text-emerald-950" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white group-hover:text-emerald-100 transition-colors">
                  + Saisie Culte
                </p>
                <p className="text-[10px] text-emerald-200/80">Dîmes & Offrandes</p>
              </div>
            </Link>

            {/* Action 2: Décaissement (Amber/Bronze Gradient Backdrop) */}
            <Link
              href="/transactions/expenses"
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-900/90 via-stone-900 to-amber-950 p-3.5 border border-amber-500/40 hover:border-amber-300 hover:from-amber-800 hover:to-stone-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-950/60 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 font-bold shadow-md ring-2 ring-amber-300/30 group-hover:scale-105 transition-transform">
                <ReceiptTextIcon className="h-5 w-5 text-amber-950" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white group-hover:text-amber-100 transition-colors">
                  - Décaissement
                </p>
                <p className="text-[10px] text-amber-200/80">Dépense avec Reçu</p>
              </div>
            </Link>

            {/* Action 3: Charges Fixes (Cobalt/Slate Gradient Backdrop) */}
            <Link
              href="/recurrent-expenses/validation"
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-900/90 via-slate-900 to-blue-950 p-3.5 border border-sky-500/40 hover:border-sky-300 hover:from-blue-800 hover:to-slate-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/60 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md relative"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-slate-950 font-bold shadow-md ring-2 ring-sky-300/30 group-hover:scale-105 transition-transform">
                <LightningBoltIcon className="h-5 w-5 text-slate-950" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white group-hover:text-sky-100 transition-colors">
                    Charges Fixes
                  </p>
                  {activePendingRecurrents.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                      {activePendingRecurrents.length}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-sky-200/80">Loyer, SEEG, Factures</p>
              </div>
            </Link>

            {/* Action 4: Rapport A4 (Slate/Charcoal Gradient Backdrop) */}
            <Link
              href="/reports"
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-800/90 via-stone-900 to-slate-950 p-3.5 border border-slate-400/40 hover:border-stone-300 hover:from-slate-700 hover:to-stone-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/60 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 text-stone-900 font-bold shadow-md ring-2 ring-white/30 group-hover:scale-105 transition-transform">
                <DocumentReportIcon className="h-5 w-5 text-stone-900" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white group-hover:text-stone-200 transition-colors">
                  Rapport A4
                </p>
                <p className="text-[10px] text-stone-300/80">Homologué Culte</p>
              </div>
            </Link>
          </div>
        </section>

        {/* ── 2. METRICS & FINANCIAL HEALTH GAUGES (Clean 2xl Rounded Cards, Solid Borders) ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Indicateur de Santé & Seuil de Réserve */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
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
                <span className="font-serif text-lg font-bold text-emerald-950">
                  {reserveDiff > 0 ? `+${reserveDiff.toLocaleString('fr-FR')} FCFA` : `${reserveDiff.toLocaleString('fr-FR')} FCFA`}
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
                <span>0 F</span>
                <span>Seuil : {activeThreshold.toLocaleString('fr-FR')} F</span>
                <span className="font-semibold text-emerald-800">
                  {(activeThreshold * 2).toLocaleString('fr-FR')} F
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
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
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
              <p className="mt-1 font-serif text-3xl font-bold text-stone-900">
                {netProjected.toLocaleString('fr-FR')}{' '}
                <span className="text-sm font-sans font-normal text-stone-500">FCFA</span>
              </p>

              <div className="mt-3 space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                <div className="flex justify-between">
                  <span>Solde en caisse :</span>
                  <span className="font-semibold text-stone-800">{activeBalance.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Charges récurrentes prévues :</span>
                  <span className="font-semibold">-{pendingTotalAmount.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-900 pt-1 border-t border-dashed border-stone-200">
                  <span>Marge nette prévisionnelle :</span>
                  <span>{netProjected.toLocaleString('fr-FR')} F</span>
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
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingBranchIcon className="h-4 w-4 text-stone-600" />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    Paroisses & Annexes
                  </span>
                </div>
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                  {branches.length || 3} Lieux
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
                  <span className="text-[11px] font-semibold text-emerald-800">
                    {useMockData
                      ? `${GOSHEN_MOCK_DATA.summary.totalBalance.toLocaleString('fr-FR')} F`
                      : `${branches.reduce((acc, b) => acc + b.currentBalance, 0).toLocaleString('fr-FR')} F`}
                  </span>
                </button>

                {(useMockData ? GOSHEN_MOCK_DATA.branches : branches).map((b) => (
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
                    <span className="font-semibold text-stone-900">
                      {b.currentBalance.toLocaleString('fr-FR')} F
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
          <div className="lg:col-span-7 rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-emerald-950">
                  Répartition des Entrées de Culte
                </h3>
                <p className="text-xs text-stone-500">
                  Ventilation canonique des dîmes, offrandes et souscriptions spéciales
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 self-start">
                Total : {activeIncomes.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="mt-6">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-stone-100 border border-stone-200">
                {GOSHEN_MOCK_DATA.offeringsBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    title={`${item.category}: ${item.amount.toLocaleString('fr-FR')} FCFA (${item.percentage}%)`}
                    className="h-full transition-all duration-500"
                  />
                ))}
              </div>
            </div>

            {/* Breakdown Legend Grid with Vector SVG Icons */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {GOSHEN_MOCK_DATA.offeringsBreakdown.map((item, idx) => {
                const IconComponent =
                  idx === 0
                    ? CrossIcon
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
                      <p className="text-xs font-bold text-emerald-950 font-serif">
                        {item.amount.toLocaleString('fr-FR')} F
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

            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3 text-xs text-amber-950">
              <ShieldCheckIcon className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Protocole de Transparence Goshen :</strong> Le dépouillement et le comptage dominical sont obligatoirement contresignés par deux personnes avant la clôture du registre.
              </div>
            </div>
          </div>

          {/* Right: Imminent Fixed Charges (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    Charges Fixes à Valider
                  </h3>
                  <p className="text-xs text-stone-500">Loyer du temple, factures SEEG et charges</p>
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
                      <span className="font-serif text-sm font-bold text-emerald-950 whitespace-nowrap">
                        {rec.amount.toLocaleString('fr-FR')} F
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-200/80 text-xs">
                      <span className="text-[11px] text-stone-500">
                        Échéance : <strong className="text-stone-700">{new Date(rec.dueDate).toLocaleDateString('fr-FR')}</strong>
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
                <p className="font-semibold text-stone-600">Aucune écriture comptable enregistrée.</p>
                <button
                  onClick={() => setUseMockData(true)}
                  className="mt-3 text-emerald-800 font-bold underline"
                >
                  Charger les écritures de démonstration
                </button>
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
                        <span>{tx.date} à {tx.time}</span>
                        <span>&bull;</span>
                        <span>Règlement : <strong className="text-stone-600">{tx.paymentMethod.replace('_', ' ')}</strong></span>
                        <span>&bull;</span>
                        <span>Saisi par {tx.authorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Receipt Trigger */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-center pl-14 sm:pl-0">
                    <div className="text-right">
                      <p
                        className={`font-serif text-base sm:text-lg font-bold ${
                          tx.type === 'INCOME' ? 'text-emerald-800' : 'text-stone-900'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {tx.amount.toLocaleString('fr-FR')}{' '}
                        <span className="text-xs font-sans font-normal text-stone-500">FCFA</span>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
          <div className="relative max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
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
                <label className="block font-bold text-stone-700 mb-1">
                  Ville / Commune
                </label>
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
                    Solde initial (FCFA)
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
                    Seuil de réserve (FCFA)
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
