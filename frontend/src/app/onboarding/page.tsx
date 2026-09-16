'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { ShieldCheckIcon, CheckCircleIcon, ArrowRightIcon } from '@/components/icons/ChurchIcons';
import { GoshenLogo } from '@/components/icons/GoshenLogo';

// Goshen's primary market is Gabon, but the CEMAC zone (same OHADA legal
// framework, same FCFA/XAF currency — see the footer badge below) is fair
// game for a church signing up here. The flag is the "illustration" for
// picking a country; city suggestions below just adapt to the pick.
const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩' },
  { code: 'CF', name: 'Centrafrique', flag: '🇨🇫' },
  { code: 'GQ', name: 'Guinée Équatoriale', flag: '🇬🇶' },
];

// Simple suggestions for the city autocomplete below — not an exhaustive or
// enforced list. The <input list="..."> pattern lets a pastor type any city
// freely; these just speed up the common cases for the chosen country.
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  GA: [
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
    'Ntoum',
    'Bitam',
    'Koulamoutou',
    'Makokou',
    'Gamba',
    'Ndendé',
  ],
  CM: ['Yaoundé', 'Douala', 'Garoua', 'Bafoussam', 'Bamenda', 'Maroua', 'Ngaoundéré'],
  CG: ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso'],
  TD: ["N'Djamena", 'Moundou', 'Sarh', 'Abéché'],
  CF: ['Bangui', 'Bimbo', 'Berbérati'],
  GQ: ['Malabo', 'Bata', 'Ebebiyín'],
};

const COMMON_DENOMINATIONS = [
  'Alliance Chrétienne & Missionnaire',
  'Assemblées de Dieu du Gabon',
  'Église Évangélique du Gabon',
  'Communauté Baptiste',
  'Mission Évangélique de Pentecôte',
  'Ministère Évangélique Indépendant',
];

// A church signing up here is, by default, a single autonomous parish —
// not a denomination pre-planning a branch network. So onboarding asks for
// exactly what's needed to open the books (name, city, denomination) and
// nothing more: no separate "siège" naming, no annexes, no starting-balance
// step. Everything deferred here (annexes, balances, thresholds) is fully
// editable afterwards from Settings once the church actually needs it.
export default function OnboardingPage() {
  const router = useRouter();
  const { refreshBranches } = useBranch();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Every field starts genuinely blank — no pre-filled example data a real
  // pastor would have to notice and clear out themselves. Country is the one
  // exception: Gabon is pre-selected since it's the primary market, but any
  // CEMAC country is one click away.
  const [churchName, setChurchName] = useState('');
  const [country, setCountry] = useState('GA');
  const [city, setCity] = useState('');
  const [denomination, setDenomination] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(true);

  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const citySuggestions = CITIES_BY_COUNTRY[country] ?? [];
  const filteredCitySuggestions = citySuggestions.filter((c) =>
    c.toLowerCase().includes(city.trim().toLowerCase()),
  );
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
                  Création de compte
                </h1>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 mt-1">
                  Ouvrons votre Église
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  L’essentiel pour démarrer. Vous pourrez tout ajuster ensuite — annexes, équipe,
                  trésorerie — depuis les Paramètres.
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
                    autoFocus
                    placeholder="Ex : Communauté Évangélique de la Grâce"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">Pays</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCountry(c.code)}
                        title={c.name}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                          country === c.code
                            ? 'bg-emerald-800 text-white font-bold'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span className="text-sm leading-none">{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <label className="block font-bold text-stone-700 mb-1">Ville</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={`Ex : ${citySuggestions[0] ?? 'votre ville'}`}
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setCityMenuOpen(true);
                    }}
                    onFocus={() => setCityMenuOpen(true)}
                    onBlur={() => setCityMenuOpen(false)}
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                  />
                  {/* Custom-styled suggestions — a native <datalist> here
                      renders with unstyleable browser chrome that clashes
                      with the rest of the design, so this is a small
                      hand-built dropdown matching the app's own look. */}
                  {cityMenuOpen && filteredCitySuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1.5 w-full max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg py-1">
                      {filteredCitySuggestions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCity(c);
                            setCityMenuOpen(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Dénomination ou Réseau d&apos;Églises
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Alliance Chrétienne & Missionnaire"
                    value={denomination}
                    onChange={(e) => setDenomination(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                  />
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                      Suggestions courantes au Gabon (facultatif) :
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

                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">Type de paroisse</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsMainBranch(true)}
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        isMainBranch
                          ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
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
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        !isMainBranch
                          ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
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
