import 'server-only';

export interface ChariowPhoneInput {
  phone?: string | undefined;
  phoneCountry?: string | undefined;
  phoneLocal?: string | undefined;
}

export interface ChariowNormalizedPhone {
  number: string;
  country_code: string;
}

export interface CreateCheckoutInput {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: ChariowPhoneInput;
  redirectUrl: string;
  customMetadata?: Record<string, string>;
  discountCode?: string;
}

export interface ChariowCheckoutResponse {
  purchaseId: string;
  checkoutUrl: string;
  amount: {
    value: number;
    currency: string;
  };
}

export interface ChariowSaleStatus {
  status: 'succeeded' | 'failed' | 'abandoned' | 'pending';
  rawStatus: string;
  amount: {
    value: number;
    currency: string;
  };
  settledAt?: string;
}

/**
 * Normalise le téléphone pour Chariow selon les règles strictes de Chariow.md:
 * - number: numéro national SANS indicatif et SANS le 0 initial
 * - country_code: code ISO2 en majuscules (ex: GA, SN, CI, FR)
 */
export function resolveChariowPhone(input: ChariowPhoneInput): ChariowNormalizedPhone {
  const countryCode = (input.phoneCountry || 'GA').toUpperCase().trim();
  let localNum = (input.phoneLocal || input.phone || '').replace(/[^0-9]/g, '');

  // Si commence par l'indicatif Gabon 241, retirer l'indicatif
  if (localNum.startsWith('241') && localNum.length > 8) {
    localNum = localNum.slice(3);
  }
  // Si commence par l'indicatif Sénégal 221
  if (localNum.startsWith('221') && localNum.length > 8) {
    localNum = localNum.slice(3);
  }
  // Si commence par l'indicatif Côte d'Ivoire 225
  if (localNum.startsWith('225') && localNum.length > 9) {
    localNum = localNum.slice(3);
  }
  // Retirer le 0 national initial (ex: 074123456 -> 74123456)
  if (localNum.startsWith('0')) {
    localNum = localNum.replace(/^0+/, '');
  }

  // Si vide, numéro fallback pour éviter 400
  if (!localNum) {
    localNum = '74000000';
  }

  return {
    number: localNum,
    country_code: countryCode,
  };
}

/**
 * Mappe les statuts Chariow selon la table de vérité de Chariow.md §3.3
 */
export function mapChariowStatus(
  raw: string | undefined,
): 'succeeded' | 'failed' | 'abandoned' | 'pending' {
  if (!raw) return 'pending';
  const s = raw.toLowerCase().trim();

  // Règle d'or : tester 'unpaid' en premier pour éviter que 'paid' dedans match
  if (s.includes('unpaid')) return 'pending';

  // Échecs / Annulations
  if (s.includes('failed') || s.includes('error')) return 'failed';
  if (s.includes('cancel') || s.includes('abandon') || s.includes('refund')) return 'abandoned';

  // Succès (settled = réglé/encaissé = PAYÉ !)
  if (
    s.includes('settle') ||
    s.includes('complete') ||
    s.includes('paid') ||
    s.includes('success')
  ) {
    return 'succeeded';
  }

  return 'pending';
}

/**
 * Thrown when CHARIOW_API_KEY is absent and the request cannot be served by
 * the dev-only mock. Route handlers should map this to 503
 * PAYMENT_PROVIDER_UNCONFIGURED — never to a fabricated success response.
 */
export class ChariowNotConfiguredError extends Error {
  constructor(message = 'Chariow is not configured (CHARIOW_API_KEY missing)') {
    super(message);
    this.name = 'ChariowNotConfiguredError';
  }
}

/**
 * The mock/no-key fallback below exists for local development and demos
 * without real Chariow credentials. It must NEVER activate in production —
 * a church could believe a subscription payment went through when no real
 * charge was ever attempted. Set CHARIOW_ALLOW_MOCK=1 to explicitly opt
 * back into the mock in a production-like environment (e.g. a staging
 * deploy that intentionally has no real credentials) — never do this for a
 * live deployment handling real church subscriptions.
 */
function mockAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.CHARIOW_ALLOW_MOCK === '1';
}

export class ChariowClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || process.env.CHARIOW_API_KEY || '';
    this.apiUrl = (apiUrl || process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1').replace(
      /\/$/,
      '',
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<ChariowCheckoutResponse> {
    if (!this.apiKey) {
      if (!mockAllowed()) {
        throw new ChariowNotConfiguredError();
      }
      // Mock pour environnement de développement / démo sans clé
      return {
        purchaseId: `mock_purch_${Date.now()}`,
        checkoutUrl: `${input.redirectUrl}&mock=true&purchaseId=mock_purch_${Date.now()}`,
        amount: {
          value: 3500,
          currency: 'XAF',
        },
      };
    }

    const phone = resolveChariowPhone(input.phone);

    const payload = {
      product_id: input.productId,
      email: input.email,
      first_name: input.firstName || 'Responsable',
      last_name: input.lastName || 'Église',
      phone,
      redirect_url: input.redirectUrl,
      custom_metadata: input.customMetadata || {},
      ...(input.discountCode ? { discount_code: input.discountCode } : {}),
    };

    const res = await fetch(`${this.apiUrl}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chariow checkout failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const data = json.data || json;

    return {
      purchaseId: data.purchase?.id || data.id,
      checkoutUrl: data.payment?.checkout_url || data.checkout_url,
      amount: {
        value: data.purchase?.amount?.value || 3500,
        currency: data.purchase?.amount?.currency || 'XAF',
      },
    };
  }

  async getSale(purchaseId: string): Promise<ChariowSaleStatus> {
    if (!this.apiKey || purchaseId.startsWith('mock_')) {
      if (!mockAllowed()) {
        throw new ChariowNotConfiguredError();
      }
      return {
        status: 'succeeded',
        rawStatus: 'settled',
        amount: { value: 3500, currency: 'XAF' },
        settledAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${this.apiUrl}/sales/${purchaseId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chariow getSale failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const data = json.data || json;

    const rawStatus = data.status || 'pending';
    const status = mapChariowStatus(rawStatus);

    return {
      status,
      rawStatus,
      amount: {
        value: data.amount?.value || 0,
        currency: data.amount?.currency || 'XAF',
      },
      settledAt: data.settled_at || data.paid_at || data.completed_at,
    };
  }
}

export const chariow = new ChariowClient();
