'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { api } from '@/lib/api';
import { SearchIcon, BellIcon } from '@/components/icons/ChurchIcons';

const NOTIFICATION_POLL_MS = 60_000;

export function AppHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { church, branches, currentBranch, isConsolidated, selectBranch } = useBranch();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api<{ count: number }>('/api/notifications/count');
      setUnreadCount(res.count);
    } catch {
      // Non-critical — leave the last known count on the badge.
    }
  }, [user]);

  useEffect(() => {
    void refreshUnreadCount();
    const timer = setInterval(() => void refreshUnreadCount(), NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshUnreadCount]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-none shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Church Name */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white font-serif font-bold text-xl shadow-xs">
              G
            </div>
            <div>
              <span className="block font-serif text-lg font-bold tracking-tight text-emerald-950">
                Goshen
              </span>
              <span className="hidden text-xs font-medium text-emerald-700 sm:inline-block">
                {church?.name || 'Gestion financière'}
              </span>
            </div>
          </Link>

          {/* Plan badge */}
          {church && (
            <span
              className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-block ${
                church.plan === 'PREMIUM'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : church.plan === 'ESSENTIAL'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-stone-100 text-stone-700'
              }`}
            >
              {church.plan === 'PREMIUM'
                ? 'Plan Premium'
                : church.plan === 'ESSENTIAL'
                  ? 'Plan Essentiel'
                  : 'Plan Gratuit'}
            </span>
          )}
        </div>

        {/* Global Search Bar (Center) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher une écriture, reçu, quête, membre... (⌘K)"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/80 py-1.5 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Branch Selector, Notification & Profile Avatar */}
        <div className="flex items-center gap-3">
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
              <span className="text-xs text-stone-500 hidden md:inline">Annexe :</span>
              <select
                aria-label="Sélectionner une annexe"
                value={isConsolidated ? 'CONSOLIDATED' : currentBranch?.id || ''}
                onChange={(e) => selectBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-stone-900 focus:outline-hidden cursor-pointer rounded-lg"
              >
                <option value="CONSOLIDATED">Vue consolidée (Toutes)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Professional Vector Bell Notification */}
          <Link
            href="/notifications"
            className="group relative rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-900 transition-colors"
            title={
              unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Centre de notifications'
            }
          >
            <BellIcon className="h-5 w-5 text-stone-600 group-hover:text-emerald-900 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User Profile Avatar with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-white font-bold text-xs shadow-xs ring-2 ring-emerald-700/40 hover:ring-emerald-600 transition-all focus:outline-hidden cursor-pointer"
              title="Menu du compte & Déconnexion"
              aria-expanded={isProfileMenuOpen}
            >
              {user?.name
                ? user.name.slice(0, 2).toUpperCase()
                : user?.email
                  ? user.email.slice(0, 1).toUpperCase()
                  : 'G'}
            </button>

            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl z-50">
                  <div className="px-3 py-2.5 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {user?.name || 'Administrateur'}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-200">
                      {church?.role || 'Responsable de Caisse'}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-emerald-950 transition-colors"
                    >
                      <span>Paramètres</span>
                      <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
                    </Link>
                    <Link
                      href="/settings?tab=membres"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-emerald-950 transition-colors"
                    >
                      <span>Membres & Rôles</span>
                    </Link>
                  </div>

                  <div className="border-t border-stone-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        void handleLogout();
                      }}
                      className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
