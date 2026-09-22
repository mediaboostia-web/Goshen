'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { GoshenLogo } from '@/components/icons/GoshenLogo';
import { HeartHandIcon, ShieldCheckIcon, CheckCircleIcon } from '@/components/icons/ChurchIcons';

const STATIC_DONATION_URL = 'https://church-book.mymaketou.shop/products/goshen-finances/checkout';
const AMOUNT_PRESETS = [2000, 10000, 50000, 100000];

export default function SoutenirPage() {
  const { user } = useAuth();

  const [amount, setAmount] = useState<number>(10000);
  const [customInput, setCustomInput] = useState<string>('10000');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>(user?.email || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showStaticFallback, setShowStaticFallback] = useState<boolean>(false);

  function handleSelectPreset(val: number) {
    setAmount(val);
    setCustomInput(val.toString());
    setError(null);
  }

  function handleInputChange(val: string) {
    setCustomInput(val);
    setError(null);
    const parsed = Number.parseInt(val.replace(/\s+/g, ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setAmount(parsed);
    } else {
      setAmount(0);
    }
  }

  async function handleDonate() {
    setError(null);

    if (!Number.isFinite(amount) || amount < 100) {
      setError('Veuillez sélectionner ou saisir un montant valide (minimum 100 FCFA).');
      return;
    }
    if (!donorEmail.trim()) {
      setError('Veuillez saisir votre adresse email pour recevoir le reçu de paiement.');
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ redirectUrl: string; donationId: string }>(
        '/api/donations/checkout',
        {
          method: 'POST',
          body: {
            amount,
            donorEmail: donorEmail.trim(),
            donorName: donorName.trim() || undefined,
          },
        },
      );
      window.location.href = res.redirectUrl;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DONATION_PROVIDER_UNCONFIGURED') {
        setShowStaticFallback(true);
      } else if (err instanceof ApiError) {
        setError(err.message || 'Échec de la création du don.');
      } else {
        setError('Erreur réseau. Veuillez vérifier votre connexion.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-950 relative overflow-hidden">
      {/* Decorative background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-100/60 via-amber-50/40 to-transparent blur-3xl"
      />

      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <GoshenLogo
              className="h-7 w-7 shrink-0 transition-transform group-hover:scale-105"
              style={{ color: '#0F172A' }}
            />
            <span className="font-serif text-lg font-extrabold tracking-tight text-emerald-950">
              Goshen
            </span>
          </Link>
          <Link
            href={user ? '/dashboard' : '/'}
            className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-600 shadow-2xs hover:border-emerald-300 hover:text-emerald-900 transition-all"
          >
            {user ? '← Tableau de bord' : '← Accueil'}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-xl px-4 py-10 sm:py-14">
        {/* Header Hero Pitch */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 shadow-xs">
            <HeartHandIcon className="h-7 w-7 text-rose-600" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-950">
            Soutenir Goshen Finance
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
            Goshen est 100% gratuit pour toutes les églises. Votre soutien libre permet de maintenir
            la plateforme en ligne, de l'améliorer continuellement et de créer des solutions
            innovantes adaptées aux communautés ecclésiastiques.
          </p>
        </div>

        {showStaticFallback ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-7 sm:p-9 shadow-xl text-center space-y-4">
            <p className="text-xs sm:text-sm text-stone-600">
              Le paiement direct est temporairement indisponible. Vous pouvez soutenir la plateforme
              via notre lien sécurisé :
            </p>
            <a
              href={STATIC_DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-emerald-800 px-7 py-3.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all"
            >
              Faire un don sur Maketou &rarr;
            </a>
          </div>
        ) : (
          <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-6 sm:p-9 shadow-xl shadow-stone-200/50 backdrop-blur-xs space-y-7">
            {/* Montant Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
                  Choisissez un montant
                </label>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  En FCFA (XAF)
                </span>
              </div>

              {/* 4 Presets: 2000, 10000, 50000, 100000 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {AMOUNT_PRESETS.map((preset) => {
                  const isSelected = amount === preset && customInput === preset.toString();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`group relative flex flex-col items-center justify-center rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs scale-[1.02]'
                          : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300 text-stone-800'
                      }`}
                    >
                      {preset === 10000 && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-xs">
                          Recommandé
                        </span>
                      )}
                      <span className="font-serif text-base sm:text-lg font-extrabold tracking-tight">
                        {preset.toLocaleString('fr-FR')}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                          isSelected
                            ? 'text-emerald-700'
                            : 'text-stone-400 group-hover:text-stone-500'
                        }`}
                      >
                        FCFA
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div className="mt-3.5">
                <div className="relative rounded-2xl border border-stone-200 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10 bg-stone-50/50 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-xs font-semibold text-stone-400">Montant :</span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={100}
                    step={500}
                    placeholder="Montant libre"
                    value={customInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full pl-20 pr-16 py-3 text-sm font-bold text-stone-900 bg-transparent focus:outline-hidden placeholder:font-normal placeholder:text-stone-400"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <span className="text-xs font-extrabold text-stone-400">FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Donor Details */}
            <div className="space-y-4 pt-1 border-t border-stone-100">
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Votre nom <span className="text-stone-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3.5 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-600/10 transition-all placeholder:text-stone-400"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Adresse email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3.5 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-600/10 transition-all placeholder:text-stone-400"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2">
                <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                <p className="leading-snug">{error}</p>
              </div>
            )}

            {/* Action CTA with dynamic amount */}
            <div>
              <button
                type="button"
                disabled={loading || amount <= 0}
                onClick={() => void handleDonate()}
                className="group relative w-full transform rounded-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 py-4 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:bg-emerald-700 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Préparation du paiement sécurisé…
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>
                      {amount > 0
                        ? `Soutenir avec ${amount.toLocaleString('fr-FR')} FCFA`
                        : 'Choisir un montant'}
                    </span>
                    <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                  </span>
                )}
              </button>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-[11px] text-stone-500 text-center">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Paiement sécurisé via Maketou
                </span>
                <span className="hidden sm:inline text-stone-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                  MTN, Moov, Celtiis & Carte bancaire
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
