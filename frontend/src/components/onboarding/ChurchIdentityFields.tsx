'use client';

import { Select } from '@/components/ui/Select';

// Full ISO 3166-1 country list, generated (not hand-picked) so no region is
// favored over another — Goshen has no single home market. Names come from
// Intl.DisplayNames (French) and flags are derived from the code itself, so
// there is no large hardcoded name/flag table to maintain or bias.
const COUNTRY_CODES = [
  'AF',
  'ZA',
  'AL',
  'DZ',
  'DE',
  'AD',
  'AO',
  'AG',
  'SA',
  'AR',
  'AM',
  'AU',
  'AT',
  'AZ',
  'BS',
  'BH',
  'BD',
  'BB',
  'BE',
  'BZ',
  'BJ',
  'BT',
  'BY',
  'BO',
  'BA',
  'BW',
  'BR',
  'BN',
  'BG',
  'BF',
  'BI',
  'KH',
  'CM',
  'CA',
  'CV',
  'CF',
  'CL',
  'CN',
  'CY',
  'CO',
  'KM',
  'CG',
  'CD',
  'KP',
  'KR',
  'CR',
  'CI',
  'HR',
  'CU',
  'DK',
  'DJ',
  'DM',
  'EG',
  'AE',
  'EC',
  'ER',
  'ES',
  'EE',
  'SZ',
  'US',
  'ET',
  'FJ',
  'FI',
  'FR',
  'GA',
  'GM',
  'GE',
  'GH',
  'GR',
  'GD',
  'GT',
  'GN',
  'GW',
  'GQ',
  'GY',
  'HT',
  'HN',
  'HU',
  'IN',
  'ID',
  'IQ',
  'IR',
  'IE',
  'IS',
  'IL',
  'IT',
  'JM',
  'JP',
  'JO',
  'KZ',
  'KE',
  'KG',
  'KI',
  'KW',
  'LA',
  'LS',
  'LV',
  'LB',
  'LR',
  'LY',
  'LI',
  'LT',
  'LU',
  'MK',
  'MG',
  'MY',
  'MW',
  'MV',
  'ML',
  'MT',
  'MA',
  'MH',
  'MU',
  'MR',
  'MX',
  'FM',
  'MD',
  'MC',
  'MN',
  'ME',
  'MZ',
  'MM',
  'NA',
  'NR',
  'NP',
  'NI',
  'NE',
  'NG',
  'NO',
  'NZ',
  'OM',
  'UG',
  'UZ',
  'PK',
  'PW',
  'PA',
  'PG',
  'PY',
  'NL',
  'PE',
  'PH',
  'PL',
  'PT',
  'QA',
  'CZ',
  'DO',
  'RO',
  'GB',
  'RU',
  'RW',
  'KN',
  'SM',
  'VC',
  'LC',
  'SB',
  'WS',
  'ST',
  'SN',
  'RS',
  'SC',
  'SL',
  'SG',
  'SK',
  'SI',
  'SO',
  'SD',
  'SS',
  'LK',
  'SE',
  'CH',
  'SR',
  'SY',
  'TJ',
  'TW',
  'TZ',
  'TD',
  'TH',
  'TL',
  'TG',
  'TO',
  'TT',
  'TN',
  'TM',
  'TV',
  'UA',
  'UY',
  'VU',
  'VA',
  'VE',
  'VN',
  'YE',
  'ZM',
  'ZW',
];

function flagEmoji(code: string): string {
  return code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['fr'], { type: 'region' })
    : null;

export const COUNTRIES: { code: string; name: string; flag: string }[] = COUNTRY_CODES.map(
  (code) => ({
    code,
    name: regionNames?.of(code) || code,
    flag: flagEmoji(code),
  }),
).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

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
// start blank since Google never collects them). Only the name is required;
// country/city/denomination are quick, optional, single-field inputs — no
// suggestion chips or nested pickers — so the form stays short and fast.
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
  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="block font-bold text-stone-700 mb-1">Nom de l’Église *</label>
        <input
          type="text"
          required
          placeholder="Ex : Communauté Évangélique de la Grâce"
          value={churchName}
          onChange={(e) => onChurchNameChange(e.target.value)}
          className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-stone-700 mb-1">
            Pays <span className="font-normal text-stone-400">(facultatif)</span>
          </label>
          <Select
            aria-label="Pays"
            value={country}
            onChange={onCountryChange}
            placeholder="Sélectionnez"
            searchable
            searchPlaceholder="Rechercher un pays…"
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
          />
        </div>

        <div>
          <label className="block font-bold text-stone-700 mb-1">
            Ville <span className="font-normal text-stone-400">(facultatif)</span>
          </label>
          <input
            type="text"
            autoComplete="off"
            placeholder="Nom de votre ville"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block font-bold text-stone-700 mb-1">
          Dénomination <span className="font-normal text-stone-400">(facultatif)</span>
        </label>
        <input
          type="text"
          placeholder="Ex : Baptiste, Pentecôtiste, Méthodiste…"
          value={denomination}
          onChange={(e) => onDenominationChange(e.target.value)}
          className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
        />
      </div>
    </div>
  );
}
