'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { GoshenLogo } from '@/components/icons/GoshenLogo';

function SoutenirMerciContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const donationId = searchParams.get('donationId') || '';

  const [status, setStatus] = useState<'polling' | 'success' | 'delayed' | 'missing'>(
    donationId ? 'polling' : 'missing',
  );
  const attemptsRef = useRef<number>(0);

  useEffect(() => {
    if (!donationId) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    async function checkStatus() {
      attemptsRef.current += 1;
      try {
        const res = await api<{ verified: boolean; retryAfterMs?: number }>(
          '/api/donations/verify',
          { method: 'POST', body: { donationId } },
        );

        if (res.verified) {
          if (isMounted) setStatus('success');
          return;
        }

        if (attemptsRef.current >= 8) {
          if (isMounted) setStatus('delayed');
          return;
        }

        if (isMounted) {
          timer = setTimeout(checkStatus, res.retryAfterMs || 3000);
        }
      } catch {
        if (attemptsRef.current >= 5) {
          if (isMounted) setStatus('delayed');
        } else if (isMounted) {
          timer = setTimeout(checkStatus, 3000);
        }
      }
    }

    void checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [donationId]);

  const homeHref = user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-stone-900">
      <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 shadow-md text-center space-y-4">
        <GoshenLogo className="mx-auto h-8 w-8" style={{ color: '#0F172A' }} />

        {status === 'polling' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl animate-pulse">
              ⏳
            </div>
            <h2 className="font-serif text-2xl font-bold text-emerald-950">Merci pour votre don</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Vérification de votre paiement en cours…
            </p>
            <p className="text-[11px] text-stone-400">
              Vérification automatique (tentative {attemptsRef.current}/8)…
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <h2 className="font-serif text-2xl font-bold text-emerald-950">Don confirmé !</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Merci pour votre générosité — votre soutien aide à faire vivre Goshen Finance.
            </p>
            <Link
              href={homeHref}
              className="block w-full rounded-lg bg-emerald-800 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              {user ? 'Retour au tableau de bord →' : "Retour à l'accueil →"}
            </Link>
          </>
        )}

        {status === 'delayed' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
              ⏱️
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">Confirmation en cours</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              La confirmation prend un peu plus de temps que prévu. Elle sera validée
              automatiquement dès réception du paiement.
            </p>
            <Link
              href={homeHref}
              className="block w-full rounded-lg bg-stone-900 py-3 text-xs font-bold text-white hover:bg-stone-800 transition-colors"
            >
              {user ? 'Retour au tableau de bord →' : "Retour à l'accueil →"}
            </Link>
          </>
        )}

        {status === 'missing' && (
          <>
            <h2 className="font-serif text-2xl font-bold text-stone-900">Don introuvable</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Aucune référence de don n’a été trouvée dans le lien.
            </p>
            <Link
              href="/soutenir"
              className="block w-full rounded-lg bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
            >
              Faire un don →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function SoutenirMerciPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800" />
        </div>
      }
    >
      <SoutenirMerciContent />
    </Suspense>
  );
}
