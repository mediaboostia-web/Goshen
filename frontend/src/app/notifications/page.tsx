'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(res.notifications || []);
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
              className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
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
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 transition-colors ${
                  notif.readAt ? 'bg-white' : 'bg-emerald-50/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-stone-900">{notif.title}</span>
                  <span className="text-[10px] text-stone-400">
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
