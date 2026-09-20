import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format an integer amount with regular ASCII space as thousands separator. */
export function formatPrice(amount: number, currency: string = ''): string {
  // Some locales (e.g. fr-FR) emit non-breaking spaces (U+00A0) as the
  // grouping separator; normalise any whitespace to a regular space for
  // predictable output.
  const formatted = Math.round(amount).toLocaleString('fr-FR').replace(/\s/g, ' ');
  return currency ? `${formatted} ${currency}` : formatted;
}

/**
 * Returns a clean, normalized display label for a currency code.
 * E.g., 'XAF' or 'XOF' -> 'FCFA', 'EUR' -> 'EUR', 'USD' -> 'USD'.
 */
export function getCurrencyLabel(currency?: string | null): string {
  if (!currency) return 'FCFA';
  const c = currency.toUpperCase().trim();
  if (c === 'XAF' || c === 'XOF') return 'FCFA';
  return c;
}

/**
 * Returns a short suffix or symbol for currency in compact table cells or cards.
 * 'FCFA' -> 'F', 'USD' -> '$', 'EUR' -> '€', etc.
 */
export function getCurrencyShort(currency?: string | null): string {
  const c = getCurrencyLabel(currency);
  if (c === 'FCFA') return 'F';
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  return c;
}

/** Format an integer or float amount with proper thousands separator and church currency. */
export function formatCurrency(amount: number, currency?: string | null): string {
  const code = getCurrencyLabel(currency);
  return formatPrice(amount, code);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARTE_BANCAIRE: 'Carte bancaire',
};

/**
 * Builds the "Moyen de paiement" display string shown on invoices/receipts
 * from the church's actually-configured payment methods (Organization.
 * paymentMethods), instead of a hardcoded placeholder string. Returns a
 * neutral message inviting configuration when nothing has been set yet.
 */
export function formatPaymentMethods(methods: string[] | null | undefined): string {
  if (!methods || methods.length === 0) {
    return 'Non configuré — voir Paramètres > Église';
  }
  return methods.map((code) => PAYMENT_METHOD_LABELS[code] ?? code).join(' / ');
}

/**
 * Detect in-app browsers (Facebook, Instagram, TikTok). These WebViews
 * often block redirects to native payment apps.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|TikTok|musical_ly|BytedanceWebview/i.test(ua);
}

/** Detect specifically the TikTok WebView. */
export function isTikTokBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /TikTok|musical_ly|BytedanceWebview/i.test(ua);
}
