'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// BranchProvider is mounted once in the root layout, above every route —
// including the public ones nobody should ever be bounced away from just
// for being logged out (that's the whole point of a landing/login/signup
// page). Keep this list in sync with the public (no-auth) routes under
// src/app/.
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/auth/error',
]);

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
  paymentMethods: string[];
  paymentDetails: string | null;
  email: string | null;
  phone: string | null;
  role?: string;
  isPastor?: boolean;
  isTreasurer?: boolean;
  isSecretary?: boolean;
  isAuditor?: boolean;
}

export interface Membership {
  id: string;
  name: string;
  slug: string;
  role: string;
  isCurrent: boolean;
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
  // Multi-church support — `memberships` almost always has exactly one row.
  memberships: Membership[];
  switchChurch: (organizationId: string) => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | null>(null);

const STORAGE_KEY_BRANCH = 'goshen_active_branch_id';

export function BranchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [church, setChurch] = useState<Church | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | 'CONSOLIDATED'>('CONSOLIDATED');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    // Wait for AuthContext to actually resolve the session first. Without
    // this, `user` is null on the very first render (AuthContext hasn't
    // finished its /api/auth/me call yet) and the branch below fires
    // immediately, setting loading=false + church=null. The instant auth
    // resolves and `user` flips non-null, any consumer reading this
    // context in that same render still sees that stale "done loading, no
    // church" snapshot — one render before this effect gets to run the
    // real fetch — and a page like dashboard/page.tsx that redirects to
    // /onboarding on "no church" fires that redirect wrongly, every time,
    // for a returning user who already has one.
    if (authLoading) return;

    if (!user) {
      setChurch(null);
      setBranches([]);
      setMemberships([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [res] = await Promise.all([
        api<{ church: Church; branches: Branch[] }>('/api/church/branches'),
        // Best-effort: memberships is a UI nicety (multi-church switcher).
        // A failure here must never block the branches load that every page
        // depends on.
        api<{ memberships: Membership[] }>('/api/church/memberships')
          .then((m) => setMemberships(m.memberships || []))
          .catch(() => setMemberships([])),
      ]);
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
      // 404 CHURCH_NOT_FOUND is the API's genuine "no org for this user yet"
      // signal (see api/church/branches/route.ts). A 401 here is different —
      // requireAuth() already had its own chance to silently refresh the
      // access token before this response ever reached us (see the retry
      // logic in lib/api.ts), so a 401 surfacing all the way to this catch
      // means that refresh attempt already failed too, i.e. a genuine
      // session problem — not "no church". Treating it the same as 404
      // used to make dashboard/page.tsx redirect a returning user with a
      // real church straight to /onboarding instead of surfacing the
      // error banner it already renders for exactly this case.
      if (err instanceof ApiError && err.status === 404) {
        setChurch(null);
        setBranches([]);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur chargement annexes');
      }
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  // Route guard: most pages under this provider (transactions, reports,
  // settings/*, recurrent-expenses, subscription…) have no auth check of
  // their own — they were relying on the previous `useUser()` import here,
  // which had this exact redirect built in, but unconditionally — meaning
  // it also ran on the public routes below (this provider wraps the whole
  // app in layout.tsx), bouncing every logged-out visitor away from the
  // landing page, /login and /signup the moment AuthContext finished
  // resolving "no session". PUBLIC_PATHS opts those routes out while
  // keeping the redirect for the protected pages that depend on it.
  useEffect(() => {
    if (!authLoading && !user && !PUBLIC_PATHS.has(pathname)) {
      router.replace('/login');
    }
  }, [authLoading, user, pathname, router]);

  const selectBranch = useCallback((id: string | 'CONSOLIDATED') => {
    setActiveBranchId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BRANCH, id);
    }
  }, []);

  const switchChurch = useCallback(
    async (organizationId: string) => {
      await api('/api/church/switch', { method: 'POST', body: { organizationId } });
      // Dropping the saved annexe: it belongs to the church we're leaving
      // and could otherwise collide with an unrelated branch id in the
      // newly active church.
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_BRANCH);
      }
      await fetchBranches();
    },
    [fetchBranches],
  );

  const isConsolidated = activeBranchId === 'CONSOLIDATED';
  const currentBranch = isConsolidated
    ? null
    : branches.find((b) => b.id === activeBranchId) || null;

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
        memberships,
        switchChurch,
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
