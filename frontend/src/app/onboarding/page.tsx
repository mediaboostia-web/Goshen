'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChurchIcon,
  BuildingBranchIcon,
} from '@/components/icons/ChurchIcons';
import { GoshenLogo } from '@/components/icons/GoshenLogo';
import { ChurchIdentityFields, COUNTRIES } from '@/components/onboarding/ChurchIdentityFields';

// A church signing up here is, by default, a single autonomous parish —
// not a denomination pre-planning a branch network. So onboarding asks for
// exactly what's needed to open the books (name, city, denomination) and
// nothing more: no separate "siège" naming, no annexes, no starting-balance
// step. Everything deferred here (annexes, balances, thresholds) is fully
// editable afterwards from Settings once the church actually needs it.
//
// Church-identity fields (name/denomination/country/city) are usually
// already filled in — carried here as query params from the signup screen
// via /verify-email (see signup/page.tsx and verify-email/page.tsx). They
// arrive blank only for the Google OAuth entry point, which skips straight
// here with a verified email and no prior form — the fields below stay
// fully editable either way, so this one screen serves both funnels.
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshBranches } = useBranch();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [churchName, setChurchName] = useState(searchParams.get('churchName') || '');
  const [denomination, setDenomination] = useState(searchParams.get('denomination') || '');
  const [country, setCountry] = useState(searchParams.get('country') || 'GA');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [isMainBranch, setIsMainBranch] = useState(true);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  async function handleFinish(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api('/api/church/onboarding', {
        method: 'POST',
        body: {
          churchName: churchName.trim(),
          denomination: denomination.trim() || undefined,
          // The one branch this creates IS the church for a standalone
          // parish — no need to make the pastor type the name twice.
          mainBranchName: churchName.trim(),
          mainBranchCity: city.trim() || undefined,
          isMainBranch,
        },
      });

      await refreshBranches();
      toast('Votre église est prête sur Goshen !', 'success');
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Une erreur est survenue lors de la configuration.');
      } else {
        setError('Erreur réseau. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-800/10 via-stone-50 to-stone-950/15 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── SPLIT-CARD ONBOARDING CONTAINER — single screen, no wizard ── */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col md:flex-row min-h-[560px]">
        {/* ── LEFT VOLET: GOSHEN BRAND & LIVE PREVIEW ── */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 p-8 sm:p-10 text-white md:w-5/12">
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border border-emerald-500/10 pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border border-emerald-500/10 pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center bg-white text-emerald-700 shadow-md">
                <GoshenLogo className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-serif text-xl font-bold tracking-tight text-white">
                  Goshen
                </span>
                <span className="block text-[11px] font-medium text-emerald-200/90">
                  Déploiement Paroissial
                </span>
              </div>
            </div>
          </div>

          {/* Fast & autonomous reassurances — replaces the old 4-step
              wizard preview. Every church starts as its own autonomous
              unit; nothing here implies a longer setup ahead. */}
          <div className="relative z-10 my-6 space-y-3.5">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-xs text-emerald-50">Prêt en moins d’une minute</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-xs text-emerald-50">Votre église est autonome dès l’activation</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-xs text-emerald-50">
                Annexes, équipe et trésorerie réglables ensuite
              </p>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="relative z-10 rounded-2xl bg-emerald-950/80 p-4 border border-emerald-700/60 shadow-lg text-xs space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              <span>Aperçu en Direct</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <p className="font-serif text-sm font-bold text-white truncate">
              {churchName.trim() || 'Votre Communauté'}
            </p>
            <p className="text-[11px] text-emerald-200/80 truncate">
              {denomination || 'Dénomination'}
            </p>
            {city.trim() && (
              <p className="text-[11px] text-emerald-200/70 pt-2 border-t border-emerald-800/80">
                {selectedCountry?.flag} {city.trim()}
                {selectedCountry ? `, ${selectedCountry.name}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT VOLET: SINGLE-SCREEN FORM ── */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:w-7/12 bg-white">
          <div>
            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleFinish} className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Dernière étape
                </h1>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                  Ouvrons votre Église
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Vérifiez vos informations et choisissez le type de paroisse. Tout sera ajustable
                  ensuite depuis les Paramètres.
                </p>
              </div>

              <ChurchIdentityFields
                churchName={churchName}
                onChurchNameChange={setChurchName}
                denomination={denomination}
                onDenominationChange={setDenomination}
                country={country}
                onCountryChange={setCountry}
                city={city}
                onCityChange={setCity}
              />

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">Type de paroisse</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMainBranch(true)}
                    className={`relative rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                      isMainBranch
                        ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {isMainBranch && (
                      <CheckCircleIcon className="absolute top-3 right-3 h-4 w-4 text-emerald-700" />
                    )}
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 ${
                        isMainBranch
                          ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      <ChurchIcon className="h-5 w-5" />
                    </div>
                    <span
                      className={`block font-bold ${isMainBranch ? 'text-emerald-900' : 'text-stone-700'}`}
                    >
                      Église Centrale
                    </span>
                    <span className="block text-[11px] text-stone-500 mt-0.5">
                      Autonome, siège de votre communauté
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMainBranch(false)}
                    className={`relative rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                      !isMainBranch
                        ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {!isMainBranch && (
                      <CheckCircleIcon className="absolute top-3 right-3 h-4 w-4 text-emerald-700" />
                    )}
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 ${
                        !isMainBranch
                          ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      <BuildingBranchIcon className="h-5 w-5" />
                    </div>
                    <span
                      className={`block font-bold ${!isMainBranch ? 'text-emerald-900' : 'text-stone-700'}`}
                    >
                      Annexe
                    </span>
                    <span className="block text-[11px] text-stone-500 mt-0.5">
                      Rattachée à un réseau d&apos;églises
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!churchName.trim() || loading}
                  className="rounded-xl bg-emerald-800 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Activation en cours…' : 'Ouvrir mon Église sur Goshen'}</span>
                  {!loading && <ArrowRightIcon className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </div>

          {/* Footer reassurance */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700" />
              Conforme OHADA & Églises CEMAC
            </span>
            <span className="font-medium text-stone-600">
              Assistance technique pasteurs disponible
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
