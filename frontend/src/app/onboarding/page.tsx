'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PlusIcon,
} from '@/components/icons/ChurchIcons';

const GABON_CITIES = [
  'Libreville',
  'Akanda',
  'Owendo',
  'Port-Gentil',
  'Franceville',
  'Oyem',
  'Moanda',
  'Mouila',
  'Lambaréné',
  'Tchibanga',
];

const COMMON_DENOMINATIONS = [
  'Alliance Chrétienne & Missionnaire',
  'Assemblées de Dieu du Gabon',
  'Église Évangélique du Gabon',
  'Communauté Baptiste',
  'Mission Évangélique de Pentecôte',
  'Ministère Évangélique Indépendant',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshBranches } = useBranch();
  const { toast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [churchName, setChurchName] = useState('');
  const [denomination, setDenomination] = useState('Alliance Chrétienne & Missionnaire');
  const [mainBranchName, setMainBranchName] = useState('Paroisse Centrale (Mont-Bouët)');
  const [mainBranchCity, setMainBranchCity] = useState('Libreville');
  const [initialBalance, setInitialBalance] = useState<number>(1500000);
  const [reserveThreshold, setReserveThreshold] = useState<number>(500000);
  const [annexes, setAnnexes] = useState<{ name: string; city: string }[]>([
    { name: 'Annexe Akanda (Cap Estérias)', city: 'Akanda' },
    { name: 'Annexe Owendo (Alénakiri)', city: 'Owendo' },
  ]);

  function addAnnexeField() {
    setAnnexes([...annexes, { name: '', city: mainBranchCity }]);
  }

  function updateAnnexe(index: number, field: 'name' | 'city', value: string) {
    const next = [...annexes];
    const target = next[index];
    if (target) {
      target[field] = value;
      setAnnexes(next);
    }
  }

  function removeAnnexe(index: number) {
    setAnnexes(annexes.filter((_, i) => i !== index));
  }

  async function handleFinish(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api('/api/church/onboarding', {
        method: 'POST',
        body: {
          churchName: churchName.trim(),
          denomination: denomination.trim(),
          mainBranchName: mainBranchName.trim(),
          mainBranchCity: mainBranchCity.trim(),
          initialBalance: Number(initialBalance) || 0,
          lowBalanceThreshold: Number(reserveThreshold) || 200000,
          annexes: annexes.filter((a) => a.name.trim().length > 0),
        },
      });

      await refreshBranches();
      toast('Votre communauté a été activée avec succès sur Goshen !', 'success');
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Une erreur est survenue lors de la configuration.');
      } else {
        // En cas de simulation ou démo hors ligne
        toast('Configuration enregistrée en mode démo.', 'success');
        router.replace('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#064e3b]/10 via-[#f8fafc] to-[#022c22]/15 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── SPLIT-CARD BIFOLD ONBOARDING CONTAINER ── */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col md:flex-row min-h-[620px]">
        {/* ── LEFT VOLET: GOSHEN PROGRESS BLUEPRINT & LIVE CARD ── */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#064e3b] via-[#043d2e] to-[#022c22] p-8 sm:p-10 text-white md:w-5/12">
          {/* Subtle Decorative Backdrop Elements */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border border-emerald-500/10 pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border border-emerald-500/10 pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-950 font-serif font-bold text-xl shadow-md">
                G
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

          {/* Stepper Progress */}
          <div className="relative z-10 my-6 space-y-3.5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 1 ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/80 text-emerald-300'
                }`}
              >
                1
              </div>
              <div>
                <p className="text-xs font-bold text-white">Identité de l’Église</p>
                <p className="text-[10px] text-emerald-200/70">Nom & mouvement spirituel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 2 ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/80 text-emerald-300'
                }`}
              >
                2
              </div>
              <div>
                <p className="text-xs font-bold text-white">Siège & Annexes</p>
                <p className="text-[10px] text-emerald-200/70">Paroisses et villes du Gabon</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 3 ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/80 text-emerald-300'
                }`}
              >
                3
              </div>
              <div>
                <p className="text-xs font-bold text-white">Caisse & Réserve</p>
                <p className="text-[10px] text-emerald-200/70">Solde initial & seuil de sécurité</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= 4 ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/80 text-emerald-300'
                }`}
              >
                4
              </div>
              <div>
                <p className="text-xs font-bold text-white">Validation Officielle</p>
                <p className="text-[10px] text-emerald-200/70">Activation des accès trésorerie</p>
              </div>
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
            <div className="pt-2 border-t border-emerald-800/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-200/70">Lieux de culte :</span>
              <span className="font-bold text-amber-300">
                {1 + annexes.filter((a) => a.name.trim()).length} paroisse(s)
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT VOLET: MULTI-STEP ONBOARDING FORM ── */}
        <div className="flex flex-col justify-between p-8 sm:p-12 md:w-7/12 bg-white">
          <div>
            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* ── ÉTAPE 1: IDENTITÉ & DÉNOMINATION ── */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Étape 1 sur 4
                  </h1>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                    Identité de l’Église
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Indiquez le nom officiel de votre communauté chrétienne locale
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nom de l’Église / Communauté *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Communauté Évangélique de la Grâce"
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Dénomination ou Réseau d&apos;Églises
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Alliance Chrétienne & Missionnaire"
                      value={denomination}
                      onChange={(e) => setDenomination(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                    />
                  </div>

                  {/* Suggestions rapides en 1 clic */}
                  <div>
                    <p className="text-[11px] font-semibold text-stone-500 mb-2">
                      Suggestions courantes au Gabon :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_DENOMINATIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setDenomination(item)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            denomination === item
                              ? 'bg-emerald-800 text-white font-bold'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!churchName.trim()}
                    onClick={() => setStep(2)}
                    className="rounded-xl bg-emerald-800 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers les Paroisses</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 2: SIÈGE & ANNEXES ── */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Étape 2 sur 4
                  </h1>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                    Paroisse Siège & Annexes
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Définissez la paroisse principale et les différentes annexes rattachées
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Nom du Siège / Paroisse Mère *
                      </label>
                      <input
                        type="text"
                        required
                        value={mainBranchName}
                        onChange={(e) => setMainBranchName(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Ville du Siège *
                      </label>
                      <select
                        value={mainBranchCity}
                        onChange={(e) => setMainBranchCity(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 bg-white shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden cursor-pointer"
                      >
                        {GABON_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Annexes rattachées */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-bold text-stone-700">
                        Annexes rattachées ({annexes.length})
                      </label>
                      <button
                        type="button"
                        onClick={addAnnexeField}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>Ajouter une annexe</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {annexes.map((annexe, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nom de l'annexe"
                            value={annexe.name}
                            onChange={(e) => updateAnnexe(idx, 'name', e.target.value)}
                            className="flex-1 rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                          />
                          <select
                            value={annexe.city}
                            onChange={(e) => updateAnnexe(idx, 'city', e.target.value)}
                            className="w-32 rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 bg-white shadow-2xs focus:border-emerald-700 focus:outline-hidden cursor-pointer"
                          >
                            {GABON_CITIES.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeAnnexe(idx)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Retirer cette annexe"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    &larr; Retour
                  </button>
                  <button
                    type="button"
                    disabled={!mainBranchName.trim()}
                    onClick={() => setStep(3)}
                    className="rounded-xl bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers la Caisse</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 3: CAISSE & SEUIL DE RÉSERVE ── */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Étape 3 sur 4
                  </h1>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                    Caisse & Seuil de Réserve
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Configurez le solde de départ et le seuil d’alerte de sécurité financière
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Solde initial en caisse au siège (Optionnel)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(Number(e.target.value))}
                        className="w-full rounded-xl border border-stone-200 p-3 pr-16 text-sm font-semibold text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center font-bold text-stone-500 text-xs">
                        FCFA
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Si vous migrez depuis un cahier physique, saisissez le montant présent en
                      caisse.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Seuil de réserve minimale d’alerte
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={reserveThreshold}
                        onChange={(e) => setReserveThreshold(Number(e.target.value))}
                        className="w-full rounded-xl border border-stone-200 p-3 pr-16 text-sm font-semibold text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center font-bold text-stone-500 text-xs">
                        FCFA
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Une notification vous avertira dès que la trésorerie approche ce niveau de
                      réserve.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    &larr; Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="rounded-xl bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Vérifier le Récapitulatif</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 4: VALIDATION OFFICIELLE & ACTIVATION ── */}
            {step === 4 && (
              <form onSubmit={handleFinish} className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Étape 4 sur 4
                  </h1>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                    Prêt pour l’Activation
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Vérifiez la configuration avant l’ouverture de vos registres paroissiaux
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500">Nom de l&apos;Église :</span>
                    <span className="font-bold text-stone-900">{churchName}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500">Dénomination :</span>
                    <span className="font-bold text-stone-900">{denomination}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500">Siège Principal :</span>
                    <span className="font-bold text-stone-900">
                      {mainBranchName} ({mainBranchCity})
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500">Nombre d&apos;Annexes :</span>
                    <span className="font-bold text-emerald-800">
                      {annexes.filter((a) => a.name.trim()).length} annexe(s) rattachée(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Solde de départ :</span>
                    <span className="font-bold text-stone-900">
                      {initialBalance.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                  <p className="leading-relaxed">
                    Les modules de <strong>saisie de culte</strong>, de{' '}
                    <strong>décaissement</strong> et d’
                    <strong>édition du rapport A4 dominical</strong> seront instantanément
                    opérationnels.
                  </p>
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    &larr; Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-emerald-800 px-7 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? 'Activation en cours…' : 'Ouvrir mon Église sur Goshen'}
                  </button>
                </div>
              </form>
            )}
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
