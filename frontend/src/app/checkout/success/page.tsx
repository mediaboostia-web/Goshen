'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { refreshBranches } = useBranch();

  const purchaseId = searchParams.get('purchaseId') || searchParams.get('id') || '';
  const plan = searchParams.get('plan') || 'ESSENTIAL';

  const [status, setStatus] = useState<'polling' | 'success' | 'delayed' | 'failed'>('polling');
  const [message, setMessage] = useState<string>(
    'Vérification du règlement en cours auprès de l’opérateur…',
  );
  const attemptsRef = useRef<number>(0);

  useEffect(() => {
    if (!purchaseId) {
      setStatus('delayed');
      setMessage('Identifiant de paiement absent de l’URL.');
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    async function checkStatus() {
      attemptsRef.current += 1;
      try {
        const res = await api<{
          verified: boolean;
          status: string;
          plan?: string;
          message?: string;
        }>('/api/subscription/verify-checkout', {
          method: 'POST',
          body: {
            purchaseId,
            plan,
          },
        });

        if (res.verified) {
          if (isMounted) {
            setStatus('success');
            setMessage('Votre abonnement Goshen a été activé avec succès !');
            await refreshBranches();
          }
          return;
        }

        if (attemptsRef.current >= 8) {
          if (isMounted) {
            setStatus('delayed');
            setMessage(
              'La confirmation de votre opérateur Mobile Money prend un peu plus de temps que prévu. Votre compte sera activé automatiquement dès réception du signal.',
            );
          }
          return;
        }

        // Poll again in 3 seconds
        if (isMounted) {
          timer = setTimeout(checkStatus, 3000);
        }
      } catch {
        if (attemptsRef.current >= 5) {
          if (isMounted) {
            setStatus('delayed');
            setMessage('Le règlement est en cours de réconciliation en arrière-plan.');
          }
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
  }, [purchaseId, plan, refreshBranches]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-stone-900">
      <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 shadow-md text-center">
        {status === 'polling' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl animate-pulse">
              ⏳
            </div>
            <h2 className="font-serif text-2xl font-bold text-emerald-950">
              Confirmation du paiement…
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">{message}</p>
            <p className="text-[11px] text-stone-400">
              Vérification automatique (tentative {attemptsRef.current}/8)…
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <h2 className="font-serif text-2xl font-bold text-emerald-950">Paiement confirmé !</h2>
            <p className="text-xs text-stone-600 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                className="block w-full rounded-lg bg-emerald-800 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Accéder à mon tableau de bord &rarr;
              </Link>
            </div>
          </div>
        )}

        {status === 'delayed' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
              ⏱️
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Paiement en cours de validation
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                className="block w-full rounded-lg bg-stone-900 py-3 text-xs font-bold text-white hover:bg-stone-800 transition-colors"
              >
                Retourner au tableau de bord &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
