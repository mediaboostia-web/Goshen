'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { flushOfflineQueue } from '@/lib/offlineQueue';

// Registers the offline service worker and tells the user, in plain words,
// what's happening to their data when the network drops or comes back.
// Skipped in dev — a caching SW fighting Turbopack's HMR is a classic
// "why is my change not showing up" trap.
export function PwaRegister() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-critical — the app still works fully online without it.
      });
    }
  }, []);

  useEffect(() => {
    function handleOffline() {
      toast(
        'Vous êtes hors connexion. L’application reste utilisable — vos saisies se synchroniseront dès le retour du réseau.',
        'info',
      );
    }
    function handleOnline() {
      toast('Connexion rétablie — synchronisation…', 'success');
      void flushOfflineQueue().then(({ synced }) => {
        if (synced > 0) {
          toast(
            `${synced} saisie${synced > 1 ? 's' : ''} hors ligne synchronisée${synced > 1 ? 's' : ''}.`,
            'success',
          );
        }
        router.refresh();
      });
    }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [toast, router]);

  return null;
}
