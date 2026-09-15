'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/contexts/AuthContext';

export interface Branch {
  id: string;
  name: string;
  city: string | null;
  isMain: boolean;
  currentBalance: number;
  lowBalanceThreshold: number;
  status: string;
}

export interface Church {
  id: string;
  slug: string;
  name: string;
  denomination: string | null;
  logoUrl: string | null;
  currency: string;
  plan: string;
  planExpiresAt: string | null;
  role?: string;
}

interface BranchContextValue {
  church: Church | null;
  branches: Branch[];
  currentBranch: Branch | null;
  isConsolidated: boolean;
  loading: boolean;
  error: string | null;
  selectBranch: (branchId: string | 'CONSOLIDATED') => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | null>(null);

const STORAGE_KEY_BRANCH = 'goshen_active_branch_id';

export function BranchProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const [church, setChurch] = useState<Church | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | 'CONSOLIDATED'>('CONSOLIDATED');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    if (!user) {
      setChurch(null);
      setBranches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api<{ church: Church; branches: Branch[] }>('/api/church/branches');
      setChurch(res.church);
      setBranches(res.branches || []);

      // Restore saved selection or default to main branch or consolidated
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_BRANCH) : null;
      if (saved && (saved === 'CONSOLIDATED' || (res.branches || []).some((b) => b.id === saved))) {
        setActiveBranchId(saved);
      } else {
        const main = (res.branches || []).find((b) => b.isMain);
        if (main) {
          setActiveBranchId(main.id);
        } else if ((res.branches || []).length > 0) {
          const first = (res.branches || [])[0];
          if (first) setActiveBranchId(first.id);
        } else {
          setActiveBranchId('CONSOLIDATED');
        }
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        // No church configured yet or not authenticated
        setChurch(null);
        setBranches([]);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur chargement annexes');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  const selectBranch = useCallback((id: string | 'CONSOLIDATED') => {
    setActiveBranchId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BRANCH, id);
    }
  }, []);

  const isConsolidated = activeBranchId === 'CONSOLIDATED';
  const currentBranch = isConsolidated ? null : branches.find((b) => b.id === activeBranchId) || null;

  return (
    <BranchContext.Provider
      value={{
        church,
        branches,
        currentBranch,
        isConsolidated,
        loading,
        error,
        selectBranch,
        refreshBranches: fetchBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return ctx;
}
