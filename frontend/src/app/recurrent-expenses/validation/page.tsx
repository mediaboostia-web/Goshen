'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';

interface PendingExecution {
  id: string;
  dueDate: string;
  amount: number;
  status: string;
  recurringExpense: {
    id: string;
    name: string;
    branch: { id: string; name: string; currentBalance: number };
    category: { name: string };
  };
}

export default function RecurrentValidationPage() {
  const { church, currentBranch, isConsolidated, refreshBranches } = useBranch();
  const { toast } = useToast();
  const canManage = church ? church.isPastor || church.isTreasurer : true;

  const [executions, setExecutions] = useState<PendingExecution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Postpone modal
  const [postponeTarget, setPostponeTarget] = useState<PendingExecution | null>(null);
  const [postponeReason, setPostponeReason] = useState<string>('');

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const activeBranchParam = isConsolidated ? 'CONSOLIDATED' : currentBranch?.id;
      const res = await api<{ pendingExecutions: PendingExecution[] }>(
        `/api/recurrent-expenses?branchId=${activeBranchParam}`,
      );
      setExecutions(res.pendingExecutions || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [isConsolidated, currentBranch]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  async function handleValidate(execution: PendingExecution) {
    setProcessingId(execution.id);
    try {
      await api('/api/recurrent-expenses/validate', {
        method: 'POST',
        body: {
          executionId: execution.id,
          action: 'VALIDATE',
        },
      });

      toast(
        `Dépense "${execution.recurringExpense.name}" de ${execution.amount.toLocaleString(
          'fr-FR',
        )} FCFA validée et décaissée !`,
        'success',
      );
      await loadPending();
      await refreshBranches();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : 'Erreur lors de la validation du décaissement',
        'error',
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handlePostpone() {
    if (!postponeTarget) return;
    setProcessingId(postponeTarget.id);
    try {
      await api('/api/recurrent-expenses/validate', {
        method: 'POST',
        body: {
          executionId: postponeTarget.id,
          action: 'POSTPONE',
          reason: postponeReason.trim() || 'Reporté par le responsable',
        },
      });

      toast(`Échéance "${postponeTarget.recurringExpense.name}" reportée.`, 'info');
      setPostponeTarget(null);
      setPostponeReason('');
      await loadPending();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur lors du report', 'error');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      {/* Postpone Modal */}
      {postponeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl border border-stone-200 text-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
              Reporter l’échéance &bull; {postponeTarget.recurringExpense.name}
            </h3>
            <p className="mt-2 text-stone-500">
              Indiquez le motif du report (ex: trésorerie insuffisante avant le culte de dimanche,
              devis en attente).
            </p>
            <div className="mt-3">
              <label className="block font-bold text-stone-700 mb-1">Motif de justification</label>
              <textarea
                rows={3}
                required
                placeholder="Ex: Fonds insuffisants en caisse, en attente de la collecte de dimanche..."
                value={postponeReason}
                onChange={(e) => setPostponeReason(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-stone-900 focus:border-emerald-700 focus:outline-hidden"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPostponeTarget(null)}
                className="rounded-lg border border-stone-300 px-3.5 py-2 font-medium text-stone-700 hover:bg-stone-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePostpone}
                disabled={!postponeReason.trim() || processingId === postponeTarget.id}
                className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                Confirmer le report
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Centre de Validation des Charges Récurrentes
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Validez en 1 clic les cotisations nationales, loyers et charges pour les déduire
            immédiatement du solde et garder une traçabilité automatique.
          </p>
        </div>

        {!canManage ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <h3 className="font-serif text-lg font-bold text-stone-900">Accès réservé</h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              Seuls le trésorier et le pasteur peuvent valider ou reporter une échéance. Votre rôle
              vous donne un accès en lecture seule aux autres pages.
            </p>
          </div>
        ) : loading ? (
          <p className="py-12 text-center text-xs text-stone-500">
            Chargement des échéances en attente…
          </p>
        ) : executions.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <span className="text-4xl">🎉</span>
            <h3 className="mt-3 font-serif text-lg font-bold text-stone-900">
              Aucune dépense en attente de validation
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              Toutes les charges récurrentes ont été réglées ou reportées. Goshen vous notifiera dès
              qu’une nouvelle échéance arrivera à terme.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((exec) => {
              const isProcessing = processingId === exec.id;
              const branchBalance = exec.recurringExpense.branch.currentBalance;
              const isBalanceTight = branchBalance < exec.amount;

              return (
                <div
                  key={exec.id}
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                        À VALIDER
                      </span>
                      <span className="text-xs text-stone-400">
                        Échéance :{' '}
                        <strong className="text-stone-700">
                          {new Date(exec.dueDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-stone-900">
                      {exec.recurringExpense.name}
                    </h3>

                    <p className="text-xs text-stone-500">
                      Lieu :{' '}
                      <span className="font-medium text-stone-700">
                        {exec.recurringExpense.branch.name}
                      </span>{' '}
                      &bull; Catégorie :{' '}
                      <span className="font-medium text-stone-700">
                        {exec.recurringExpense.category.name}
                      </span>
                    </p>

                    {isBalanceTight && (
                      <p className="text-[11px] font-semibold text-amber-700">
                        ⚠️ Solde de l’annexe ({branchBalance.toLocaleString('fr-FR')} FCFA)
                        inférieur au montant demandé.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-3">
                    <div className="font-serif text-3xl font-bold text-emerald-950">
                      {exec.amount.toLocaleString('fr-FR')}{' '}
                      <span className="text-sm font-sans font-normal text-stone-600">FCFA</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setPostponeTarget(exec)}
                        className="rounded-lg border border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        Reporter
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleValidate(exec)}
                        className="rounded-lg bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {isProcessing ? 'Validation…' : '✓ Valider & Décaisser'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
