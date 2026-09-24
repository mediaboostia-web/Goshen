'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { GoshenLogo } from '@/components/icons/GoshenLogo';
import { BellIcon } from '@/components/icons/ChurchIcons';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AdminMe {
  admin: { id: string; email: string; role: 'ADMIN' | 'SUPERADMIN' };
  can: string[];
}

const NOTIFICATION_POLL_MS = 60_000;

const NAV = [
  { href: '/admin', label: 'Vue d’ensemble', exact: true },
  { href: '/admin/organizations', label: 'Églises' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/donations', label: 'Dons' },
  { href: '/admin/audit-log', label: 'Journal d’audit' },
  { href: '/admin/system', label: 'Système' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [admin, setAdmin] = useState<AdminMe['admin'] | null>(null);
  const [checked, setChecked] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api<{ count: number }>('/api/notifications/count');
      setUnreadCount(res.count);
    } catch {
      // Non-critical — leave the last known count on the badge.
    }
  }, []);

  useEffect(() => {
    if (isLoginPage) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<AdminMe>('/api/admin/me');
        if (!cancelled) setAdmin(res.admin);
      } catch (err) {
        if (!cancelled) {
          const reason =
            err instanceof ApiError && err.status === 403 ? 'forbidden' : 'unauthenticated';
          router.replace(`/admin/login?reason=${reason}`);
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, isLoginPage]);

  useEffect(() => {
    if (isLoginPage || !admin) return;
    void refreshUnreadCount();
    const timer = setInterval(() => void refreshUnreadCount(), NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [isLoginPage, admin, refreshUnreadCount]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!checked || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 text-xs text-stone-500 font-sans">
        Vérification de l’accès…
      </main>
    );
  }

  async function handleConfirmLogout() {
    setLoggingOut(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Cookies may already be gone (e.g. tokenVersion bumped elsewhere) —
      // proceed to the login screen regardless.
    } finally {
      setLoggingOut(false);
      setIsLogoutConfirmOpen(false);
      router.replace('/admin/login');
    }
  }

  const currentLabel = NAV.find((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/'),
  )?.label;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 font-sans text-stone-900">
      <aside className="w-56 shrink-0 border-r border-stone-200 bg-white p-4 flex flex-col h-full overflow-y-auto">
        <Link href="/admin" className="flex items-center gap-2 mb-6 px-1">
          <GoshenLogo className="h-6 w-6 shrink-0" style={{ color: '#0F172A' }} />
          <span className="font-serif text-base font-extrabold text-stone-900">Admin</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  active ? 'bg-emerald-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-3 sm:px-8">
          <h1 className="text-sm font-bold text-stone-900">{currentLabel ?? 'Admin'}</h1>

          <div className="flex items-center gap-3">
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

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-900 text-white font-bold text-xs shadow-xs ring-2 ring-emerald-700/40 hover:ring-emerald-600 transition-all focus:outline-hidden cursor-pointer"
                title="Menu du compte & Déconnexion"
                aria-expanded={isProfileMenuOpen}
              >
                {admin.email.slice(0, 1).toUpperCase()}
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl z-50">
                    <div className="px-3 py-2.5 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900 truncate">{admin.email}</p>
                      <span className="inline-block mt-1.5 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                        {admin.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/admin/account"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-emerald-950 transition-colors"
                      >
                        Mon compte
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
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      </div>

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="Se déconnecter ?"
        description="Vous devrez ressaisir votre email et votre mot de passe pour accéder de nouveau au tableau de bord superadmin."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        destructive
        busy={loggingOut}
        onConfirm={() => void handleConfirmLogout()}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </div>
  );
}
