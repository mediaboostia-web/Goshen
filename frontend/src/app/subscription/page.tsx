'use client';

import { useState } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';

export default function SubscriptionPage() {
  const { church, branches } = useBranch();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<'ESSENTIAL' | 'PREMIUM'>('ESSENTIAL');
  const [phoneCountry, setPhoneCountry] = useState<string>('GA');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    if (!phoneNumber.trim()) {
      setError('Veuillez saisir le numéro Mobile Money pour le règlement.');
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ checkoutUrl: string; purchaseId: string }>(
        '/api/subscription/checkout',
        {
          method: 'POST',
          body: {
            plan: selectedPlan,
            phone: phoneNumber.trim(),
            phoneCountry,
            phoneLocal: phoneNumber.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || church?.name || undefined,
          },
        }
      );

      if (res.checkoutUrl) {
        toast('Redirection vers le paiement Mobile Money sécurisé Chariow…', 'info');
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Échec de l’initialisation du paiement');
      } else {
        setError('Erreur réseau. Veuillez vérifier votre connexion.');
      }
      setLoading(false);
    }
  }

  const currentPlan = church?.plan || 'FREE';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Abonnement & Facturation Goshen
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Réglez simplement par Mobile Money (Airtel Money, Moov Money) ou carte bancaire via
            Chariow.
          </p>
        </div>

        {/* Current Plan Status Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-stone-500 font-medium">Formule active</span>
            <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1 flex items-center gap-2">
              <span>
                {currentPlan === 'PREMIUM'
                  ? 'Plan Premium'
                  : currentPlan === 'ESSENTIAL'
                  ? 'Plan Essentiel'
                  : 'Plan Gratuit'}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Actif
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Annexes utilisées :{' '}
              <strong className="text-stone-800">{branches.length}</strong> &bull; Devise : FCFA
            </p>
          </div>

          {church?.planExpiresAt && (
            <div className="text-right">
              <span className="text-xs text-stone-500">Renouvellement le</span>
              <p className="text-sm font-bold text-stone-900">
                {new Date(church.planExpiresAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>

        {/* Plan Upgrade Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Plan Essentiel */}
          <div
            onClick={() => setSelectedPlan('ESSENTIAL')}
            className={`rounded-2xl border-2 p-6 bg-white cursor-pointer transition-all ${
              selectedPlan === 'ESSENTIAL'
                ? 'border-emerald-700 shadow-md ring-2 ring-emerald-700/20'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  RECOMMANDÉ
                </span>
                <h3 className="font-serif text-xl font-bold text-emerald-950 mt-2">Plan Essentiel</h3>
                <p className="text-xs text-stone-500">Idéal pour 1 siège + 1 à 3 annexes</p>
              </div>
              <input
                type="radio"
                name="plan"
                checked={selectedPlan === 'ESSENTIAL'}
                onChange={() => setSelectedPlan('ESSENTIAL')}
                className="h-4 w-4 text-emerald-700 cursor-pointer"
              />
            </div>

            <div className="mt-6">
              <span className="text-xs text-stone-400 line-through">5 000 FCFA</span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl font-bold text-emerald-950">3 500</span>
                <span className="text-xs text-stone-600">FCFA / mois</span>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-xs text-stone-600">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Jusqu’à 3 annexes
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> 10 utilisateurs & rôles
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Photos des reçus & justificatifs
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Rapports PDF illimités
              </li>
            </ul>
          </div>

          {/* Plan Premium */}
          <div
            onClick={() => setSelectedPlan('PREMIUM')}
            className={`rounded-2xl border-2 p-6 bg-white cursor-pointer transition-all ${
              selectedPlan === 'PREMIUM'
                ? 'border-emerald-700 shadow-md ring-2 ring-emerald-700/20'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  RÉSEAUX & DISTRICTS
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-2">Plan Premium</h3>
                <p className="text-xs text-stone-500">Pour les grandes assemblées multi-sites</p>
              </div>
              <input
                type="radio"
                name="plan"
                checked={selectedPlan === 'PREMIUM'}
                onChange={() => setSelectedPlan('PREMIUM')}
                className="h-4 w-4 text-emerald-700 cursor-pointer"
              />
            </div>

            <div className="mt-6">
              <span className="text-xs text-stone-400 line-through">20 000 FCFA</span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl font-bold text-stone-900">15 000</span>
                <span className="text-xs text-stone-600">FCFA / mois</span>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-xs text-stone-600">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Jusqu’à 10 annexes
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Utilisateurs & rôles illimités
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Vue consolidée régionale
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Support WhatsApp direct
              </li>
            </ul>
          </div>
        </div>

        {/* Chariow Mobile Money Payment Box */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                Règlement sécurisé par Mobile Money (Chariow)
              </h3>
              <p className="text-[11px] text-stone-500">
                Airtel Money &bull; Moov Money &bull; Wave &bull; Orange Money &bull; Carte Visa/Mastercard
              </p>
            </div>
            <span className="text-2xl">🔒</span>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Prénom du payeur</label>
              <input
                type="text"
                placeholder="Ex: Éric"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-stone-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Nom de famille</label>
              <input
                type="text"
                placeholder="Ex: Ndong"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-stone-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Pays</label>
              <select
                value={phoneCountry}
                onChange={(e) => setPhoneCountry(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-stone-900 focus:outline-hidden"
              >
                <option value="GA">🇬🇦 Gabon (+241)</option>
                <option value="SN">🇸🇳 Sénégal (+221)</option>
                <option value="CI">🇨🇮 Côte d’Ivoire (+225)</option>
                <option value="CM">🇨🇲 Cameroun (+237)</option>
                <option value="FR">🇫🇷 France (+33)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">
                Numéro Mobile Money (Airtel / Moov) *
              </label>
              <input
                type="tel"
                required
                placeholder="Ex: 074123456 ou 74123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2.5 text-stone-900 font-semibold focus:outline-hidden"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Le numéro sera normalisé automatiquement au format de l’opérateur par Goshen.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-stone-600">
              Montant à régler :{' '}
              <strong className="font-serif text-lg text-emerald-950">
                {selectedPlan === 'PREMIUM' ? '15 000' : '3 500'} FCFA
              </strong>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="w-full sm:w-auto rounded-lg bg-emerald-800 px-7 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading
                ? 'Génération du paiement…'
                : 'Procéder au paiement Mobile Money &rarr;'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
