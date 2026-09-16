'use client';

import { useState } from 'react';

// Goshen's primary market is Gabon, but the CEMAC zone (same OHADA legal
// framework, same FCFA/XAF currency) is fair game for a church signing up
// here. The flag is the "illustration" for picking a country; city
// suggestions below just adapt to the pick.
export const COUNTRIES: { code: string; name: string; flag: string }[] = [
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

interface ChurchIdentityFieldsProps {
  churchName: string;
  onChurchNameChange: (value: string) => void;
  denomination: string;
  onDenominationChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
}

// Shared church-identity fields (name, country, city, denomination) — used
// by both the signup screen (first pass) and the post-verification
// onboarding screen (pre-filled from what was typed at signup, still
// editable — covers the Google OAuth entry point too, where these fields
// start blank since Google never collects them).
export function ChurchIdentityFields({
  churchName,
  onChurchNameChange,
  denomination,
  onDenominationChange,
  country,
  onCountryChange,
  city,
  onCityChange,
}: ChurchIdentityFieldsProps) {
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const citySuggestions = CITIES_BY_COUNTRY[country] ?? [];
  const filteredCitySuggestions = citySuggestions.filter((c) =>
    c.toLowerCase().includes(city.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block font-bold text-stone-700 mb-1">
          Nom de l’Église / Communauté *
        </label>
        <input
          type="text"
          required
          placeholder="Ex : Communauté Évangélique de la Grâce"
          value={churchName}
          onChange={(e) => onChurchNameChange(e.target.value)}
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
              onClick={() => onCountryChange(c.code)}
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
            onCityChange(e.target.value);
            setCityMenuOpen(true);
          }}
          onFocus={() => setCityMenuOpen(true)}
          onBlur={() => setCityMenuOpen(false)}
          className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
        />
        {/* Custom-styled suggestions — a native <datalist> here renders with
            unstyleable browser chrome that clashes with the rest of the
            design, so this is a small hand-built dropdown matching the
            app's own look. */}
        {cityMenuOpen && filteredCitySuggestions.length > 0 && (
          <div className="absolute z-20 mt-1.5 w-full max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg py-1">
            {filteredCitySuggestions.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onCityChange(c);
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
          onChange={(e) => onDenominationChange(e.target.value)}
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
                onClick={() => onDenominationChange(item)}
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
    </div>
  );
}
