/**
 * Currency rates and conversion engine for Goshen.
 * Standard base pivot: XAF (FCFA CEMAC)
 */

export const CURRENCY_BASE_RATES_IN_XAF: Record<string, number> = {
  XAF: 1,
  XOF: 1,
  EUR: 655.957,
  USD: 610,
  CAD: 450,
  GBP: 770,
  CHF: 690,
  CDF: 0.22,
  GNF: 0.071,
  MGA: 0.135,
  NGN: 0.4,
};

/**
 * Normalizes currency code (e.g. 'FCFA' -> 'XAF', 'fcfa' -> 'XAF')
 */
export function normalizeCurrencyCode(curr?: string | null): string {
  if (!curr) return 'XAF';
  const c = curr.trim().toUpperCase();
  if (c === 'FCFA') return 'XAF';
  return c;
}

/**
 * Converts an integer/float amount between any two supported currencies.
 */
export function convertCurrencyAmount(
  amount: number,
  fromCurr?: string | null,
  toCurr?: string | null,
): number {
  if (!amount || isNaN(amount)) return 0;
  const from = normalizeCurrencyCode(fromCurr);
  const to = normalizeCurrencyCode(toCurr);

  if (from === to) return amount;

  const fromRate = CURRENCY_BASE_RATES_IN_XAF[from] ?? 1;
  const toRate = CURRENCY_BASE_RATES_IN_XAF[to] ?? 1;

  // Amount converted into XAF
  const amountInXaf = amount * fromRate;
  // Amount converted from XAF to destination currency
  const converted = amountInXaf / toRate;

  const rounded = Math.round(converted);
  if (amount > 0 && rounded === 0) {
    return 1;
  }
  return rounded;
}
