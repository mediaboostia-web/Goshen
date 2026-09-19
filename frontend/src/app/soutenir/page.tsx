'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { GoshenLogo } from '@/components/icons/GoshenLogo';
import { HeartHandIcon } from '@/components/icons/ChurchIcons';

const STATIC_DONATION_URL = 'https://church-book.mymaketou.shop/products/goshen-finances/checkout';
const AMOUNT_PRESETS = [1000, 2500, 5000, 10000];

export default function SoutenirPage() {
  const { user } = useAuth();

  const [amount, setAmount] = useState<number>(2500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>(user?.email || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showStaticFallback, setShowStaticFallback] = useState<boolean>(false);

  const effectiveAmount = customAmount ? Number.parseInt(customAmount, 10) : amount;

  async function handleDonate() {
    setError(null);

    if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
      setError('Veuillez saisir un montant valide.');
      return;
    }
    if (!donorEmail.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ redirectUrl: string; donationId: string }>(
        '/api/donations/checkout',
        {
          method: 'POST',
          body: {
            amount: effectiveAmount,
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
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <GoshenLogo className="h-7 w-7 shrink-0" style={{ color: '#0F172A' }} />
            <span className="font-serif text-lg font-extrabold tracking-tight text-stone-900">
              Goshen
            </span>
          </Link>
          <Link
            href={user ? '/dashboard' : '/'}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
          >
            {user ? 'Retour au tableau de bord' : "Retour à l'accueil"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200">
            <HeartHandIcon className="h-7 w-7 text-rose-600" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Soutenir Goshen Finance
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
            Goshen Finance est gratuit pour toutes les communautés qui l’utilisent. Un don libre
            nous aide à maintenir et faire évoluer la plateforme.
          </p>
        </div>

        {showStaticFallback ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs text-center space-y-4">
            <p className="text-xs sm:text-sm text-stone-600">
              Le don en ligne intégré n’est pas encore disponible. Vous pouvez soutenir la
              plateforme directement via notre page de paiement sécurisée.
            </p>
            <a
              href={STATIC_DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-rose-600 px-6 py-3 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-xs"
            >
              Faire un don &rarr;
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">Montant</label>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset);
                      setCustomAmount('');
                    }}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-bold transition-colors ${
                      !customAmount && amount === preset
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {preset.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Autre montant (FCFA)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Votre nom (optionnel)
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs focus:border-rose-500 focus:outline-hidden"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs focus:border-rose-500 focus:outline-hidden"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleDonate()}
              className="w-full rounded-lg bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Redirection…' : 'Faire un don →'}
            </button>

            <p className="text-center text-[11px] text-stone-400">
              Paiement sécurisé via Maketou. Aucun compte requis.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
