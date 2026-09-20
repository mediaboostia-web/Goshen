/**
 * Country to Default Currency Mapping for Goshen.
 * Maps ISO 3166-1 alpha-2 country codes to their standard national/regional currency.
 */

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // CEMAC (Franc CFA - XAF / FCFA)
  GA: 'FCFA', // Gabon
  CM: 'FCFA', // Cameroun
  CG: 'FCFA', // Congo-Brazzaville
  CF: 'FCFA', // Centrafrique
  TD: 'FCFA', // Tchad
  GQ: 'FCFA', // Guinée Équatoriale

  // UEMOA (Franc CFA - XOF / FCFA)
  CI: 'FCFA', // Côte d'Ivoire
  SN: 'FCFA', // Sénégal
  BJ: 'FCFA', // Bénin
  BF: 'FCFA', // Burkina Faso
  ML: 'FCFA', // Mali
  NE: 'FCFA', // Niger
  TG: 'FCFA', // Togo
  GW: 'FCFA', // Guinée-Bissau

  // Other African Currencies
  CD: 'CDF', // République Démocratique du Congo (Franc Congolais)
  GN: 'GNF', // Guinée Conakry (Franc Guinéen)
  MG: 'MGA', // Madagascar (Ariary)
  NG: 'USD', // Nigeria (or USD for international church accounting)
  RW: 'USD', // Rwanda
  BI: 'USD', // Burundi
  GH: 'USD', // Ghana
  KE: 'USD', // Kenya
  ZA: 'USD', // Afrique du Sud

  // Europe (EUR)
  FR: 'EUR', // France
  BE: 'EUR', // Belgique
  IT: 'EUR', // Italie
  ES: 'EUR', // Espagne
  DE: 'EUR', // Allemagne
  PT: 'EUR', // Portugal
  NL: 'EUR', // Pays-Bas
  LU: 'EUR', // Luxembourg
  CH: 'EUR', // Suisse (or CHF)

  // Americas & International
  US: 'USD', // États-Unis
  CA: 'CAD', // Canada
  GB: 'GBP', // Royaume-Uni
  HT: 'USD', // Haïti
};

/**
 * Returns default currency for a country ISO code, falling back to FCFA.
 */
export function getCurrencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return 'FCFA';
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_TO_CURRENCY[code] || 'FCFA';
}
