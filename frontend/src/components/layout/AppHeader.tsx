'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { api } from '@/lib/api';
import { SearchIcon, BellIcon, MenuIcon, XIcon } from '@/components/icons/ChurchIcons';
import { GoshenLogo } from '@/components/icons/GoshenLogo';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { OfflineQueueBadge } from '@/components/pwa/OfflineQueueBadge';

const INK = '#0F172A';
const LINE = '#D6D6CB';

const NOTIFICATION_POLL_MS = 60_000;

export function AppHeader() {
  const router = useRouter();
  const { user, logout, loggingOut } = useAuth();
  const { church, branches, currentBranch, isConsolidated, selectBranch } = useBranch();
  const { locale, toggleLocale, t } = useLanguage();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

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

  async function handleConfirmLogout() {
    await handleLogout();
    setIsLogoutConfirmOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand & Church Name */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <GoshenLogo className="h-7 w-7 shrink-0" style={{ color: INK }} />
              <span
                className="hidden self-stretch w-px sm:block"
                style={{ backgroundColor: LINE }}
              />
              {church?.logoUrl && (
                <img
                  src={church.logoUrl}
                  alt={church.name}
                  className="hidden h-8 w-8 shrink-0 rounded-lg object-contain border border-stone-200 sm:block"
                />
              )}
              <div className="flex h-10 flex-col justify-center">
                <span
                  className="block font-serif text-lg font-extrabold tracking-tight"
                  style={{ color: INK }}
                >
                  Goshen
                </span>
                <span className="hidden text-xs font-medium text-emerald-700 sm:inline-block">
                  {church?.name || 'Gestion financière'}
                </span>
              </div>
            </Link>

            {/* Support the platform */}
            {church && (
              <Link
                href="/soutenir"
                className="hidden items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors sm:inline-flex"
              >
                {t('nav.support', 'Soutenir')} <span aria-hidden="true">♥</span>
              </Link>
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
                placeholder={t(
                  'header.search_placeholder',
                  'Rechercher une écriture, reçu, quête, membre... (⌘K)',
                )}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/80 py-1.5 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Branch Selector, Language Switcher, Notification & Profile Avatar —
              this whole cluster only fits a viewport ≥ sm. Below that, only
              the bell and a hamburger stay in the row; everything else moves
              into the collapsible mobile panel below so the header never
              wraps or overflows on a phone. */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex sm:gap-3">
              {/* Language Switcher Toggle (FR | EN) */}
              <button
                type="button"
                onClick={toggleLocale}
                className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-emerald-950 transition-colors cursor-pointer shadow-2xs"
                title={locale === 'fr' ? 'Switch to English' : 'Passer en Français'}
                aria-label="Changer de langue / Change language"
              >
                <span
                  className={
                    locale === 'fr' ? 'text-emerald-900 font-bold' : 'text-stone-400 font-medium'
                  }
                >
                  FR
                </span>
                <span className="text-stone-300 font-normal">|</span>
                <span
                  className={
                    locale === 'en' ? 'text-emerald-900 font-bold' : 'text-stone-400 font-medium'
                  }
                >
                  EN
                </span>
              </button>

              <OfflineQueueBadge />

              {branches.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
                  <span className="text-xs text-stone-500 hidden md:inline">
                    {t('header.branch', 'Annexe :')}
                  </span>
                  <Select
                    variant="ghost"
                    align="right"
                    aria-label={t('header.branch', 'Sélectionner une annexe')}
                    value={isConsolidated ? 'CONSOLIDATED' : currentBranch?.id || ''}
                    onChange={selectBranch}
                    options={[
                      {
                        value: 'CONSOLIDATED',
                        label: t('header.consolidated', 'Vue consolidée (Toutes)'),
                      },
                      ...branches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Professional Vector Bell Notification — stays visible at every breakpoint */}
            <Link
              href="/notifications"
              className="group relative rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-900 transition-colors"
              title={
                unreadCount > 0
                  ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''}`
                  : t('header.notifications', 'Centre de notifications')
              }
            >
              <BellIcon className="h-5 w-5 text-stone-600 group-hover:text-emerald-900 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Profile Avatar with Dropdown — desktop only, folded into the mobile panel below sm */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-900 text-white font-bold text-xs shadow-xs ring-2 ring-emerald-700/40 hover:ring-emerald-600 transition-all focus:outline-hidden cursor-pointer"
                title="Menu du compte & Déconnexion"
                aria-expanded={isProfileMenuOpen}
              >
                {church?.logoUrl ? (
                  <img
                    src={church.logoUrl}
                    alt={church.name}
                    className="h-full w-full object-contain"
                  />
                ) : user?.name ? (
                  user.name.slice(0, 2).toUpperCase()
                ) : user?.email ? (
                  user.email.slice(0, 1).toUpperCase()
                ) : (
                  'G'
                )}
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
                        <span>{t('header.settings', 'Paramètres')}</span>
                        <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
                      </Link>
                    </div>

                    <div className="border-t border-stone-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsLogoutConfirmOpen(true);
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        {t('nav.logout', 'Déconnexion')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle — everything folded above lives in here below sm */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              aria-expanded={isMobileMenuOpen}
              aria-label={t('header.menu', 'Menu')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-emerald-900 transition-colors cursor-pointer sm:hidden"
            >
              {isMobileMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile panel — language, offline status, branch, support link and
            account actions, all hidden from the row above below sm so the
            header itself never wraps. */}
        {isMobileMenuOpen && (
          <div className="border-t border-stone-200 bg-white px-4 py-4 sm:hidden">
            {church && (
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                {church.logoUrl && (
                  <img
                    src={church.logoUrl}
                    alt={church.name}
                    className="h-8 w-8 shrink-0 rounded-lg object-contain border border-stone-200 bg-white"
                  />
                )}
                <span className="text-sm font-semibold text-emerald-900 truncate">
                  {church.name}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLocale}
                className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-emerald-950 transition-colors cursor-pointer"
                aria-label="Changer de langue / Change language"
              >
                <span
                  className={
                    locale === 'fr' ? 'text-emerald-900 font-bold' : 'text-stone-400 font-medium'
                  }
                >
                  FR
                </span>
                <span className="text-stone-300 font-normal">|</span>
                <span
                  className={
                    locale === 'en' ? 'text-emerald-900 font-bold' : 'text-stone-400 font-medium'
                  }
                >
                  EN
                </span>
              </button>

              <OfflineQueueBadge />
            </div>

            {branches.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
                <span className="text-xs text-stone-500">{t('header.branch', 'Annexe :')}</span>
                <Select
                  variant="ghost"
                  align="left"
                  aria-label={t('header.branch', 'Sélectionner une annexe')}
                  value={isConsolidated ? 'CONSOLIDATED' : currentBranch?.id || ''}
                  onChange={selectBranch}
                  options={[
                    {
                      value: 'CONSOLIDATED',
                      label: t('header.consolidated', 'Vue consolidée (Toutes)'),
                    },
                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </div>
            )}

            {church && (
              <Link
                href="/soutenir"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-3 flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                {t('nav.support', 'Soutenir')} <span aria-hidden="true">♥</span>
              </Link>
            )}

            <div className="mt-4 border-t border-stone-100 pt-3">
              <p className="text-xs font-bold text-stone-900 truncate">
                {user?.name || 'Administrateur'}
              </p>
              <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
              <span className="inline-block mt-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-200">
                {church?.role || 'Responsable de Caisse'}
              </span>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-emerald-950 transition-colors"
              >
                <span>{t('header.settings', 'Paramètres')}</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="text-left rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                {t('nav.logout', 'Déconnexion')}
              </button>
            </div>
          </div>
        )}
      </header>

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title={t('header.logout_confirm_title', 'Se déconnecter ?')}
        description={t(
          'header.logout_confirm_desc',
          'Vous devrez ressaisir votre email et votre mot de passe pour accéder de nouveau à votre espace.',
        )}
        confirmLabel={t('nav.logout', 'Se déconnecter')}
        cancelLabel={t('header.cancel', 'Annuler')}
        destructive
        busy={loggingOut}
        onConfirm={() => void handleConfirmLogout()}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </>
  );
}
