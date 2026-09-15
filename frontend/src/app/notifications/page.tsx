'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

// Where clicking a notification should take the user, keyed by `type`
// (matches the templates in lib/server/notifications + the low-balance
// alert emitted from POST /api/transactions). Falls back to no navigation
// for unknown types — the notification still gets marked read.
function actionHrefFor(notif: NotificationItem): string | null {
  switch (notif.type) {
    case 'low_balance':
      return '/settings/branches';
    case 'recurring_expense_due':
      return '/recurrent-expenses/validation';
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      // Backend shape is { items, nextCursor } (cursor-paginated) — not
      // { notifications }. Pull a generous first page; the badge count in
      // AppHeader is the source of truth for "how many unread" beyond this.
      const res = await api<{ items: NotificationItem[]; nextCursor: string | null }>(
        '/api/notifications?limit=50',
      );
      setNotifications(res.items || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifs();
  }, [loadNotifs]);

  async function handleMarkAllRead() {
    try {
      await api('/api/notifications', {
        method: 'PATCH',
        body: { ids: 'all' },
      });
      toast('Toutes les notifications sont marquées comme lues', 'success');
      await loadNotifs();
    } catch {
      // Handled
    }
  }

  async function handleNotificationClick(notif: NotificationItem) {
    if (!notif.readAt) {
      // Optimistic local update so the row stops looking "unread" instantly.
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      try {
        await api('/api/notifications', {
          method: 'PATCH',
          body: { ids: [notif.id] },
        });
      } catch {
        // Non-critical — the next full reload will reconcile the read state.
      }
    }

    const href = actionHrefFor(notif);
    if (href) router.push(href);
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
              Centre de Notifications
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Alertes de solde bas, rappels d’échéances et activités de caisse.
            </p>
          </div>

          {notifications.some((n) => !n.readAt) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-12 text-center text-xs text-stone-500">Chargement des alertes…</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <span className="text-4xl">🔔</span>
            <h3 className="mt-3 font-serif text-base font-bold text-stone-900">
              Aucune notification
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Vous serez notifié dès qu’une dépense récurrente arrive à échéance ou si un solde
              passe sous le seuil minimal.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden shadow-xs text-xs">
            {notifications.map((notif) => {
              const clickable = actionHrefFor(notif) !== null || !notif.readAt;
              return (
                <div
                  key={notif.id}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => void handleNotificationClick(notif) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ')
                            void handleNotificationClick(notif);
                        }
                      : undefined
                  }
                  className={`p-4 transition-colors ${
                    notif.readAt ? 'bg-white' : 'bg-emerald-50/40'
                  } ${clickable ? 'cursor-pointer hover:bg-stone-50' : ''}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-bold text-stone-900 flex items-center gap-2">
                      {!notif.readAt && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                      )}
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-stone-400 shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-600 leading-relaxed">{notif.body}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
