import 'server-only';

export interface CreateCartInput {
  productDocumentId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string; // E.164 direct, e.g. "+24174000000" — unlike Chariow, no split format
  redirectUrl: string;
  customerPrice?: number; // "Prix libre" — required when the product is configured as free-amount
  meta?: Record<string, unknown>;
}

export interface MaketouCart {
  id: string;
  status: 'waiting_payment' | 'completed' | 'abandoned' | 'payment_failed';
}

export interface CreateCartResponse {
  cart: MaketouCart;
  redirectUrl: string;
}

export interface MaketouCartStatus {
  status: 'pending' | 'succeeded' | 'abandoned' | 'failed';
  rawStatus: string;
}

/**
 * Maps Maketou's closed cart-status enum. Unlike Chariow's free-text status
 * strings (which needed substring matching), Maketou documents exactly 4
 * values, so an exhaustive switch is more correct than a fuzzy match.
 */
export function mapMaketouStatus(raw: string): MaketouCartStatus['status'] {
  switch (raw) {
    case 'completed':
      return 'succeeded';
    case 'abandoned':
      return 'abandoned';
    case 'payment_failed':
      return 'failed';
    case 'waiting_payment':
    default:
      return 'pending';
  }
}

/**
 * Thrown when MAKETOU_API_KEY is absent. Route handlers map this to 503
 * DONATION_PROVIDER_UNCONFIGURED — never to a fabricated success response.
 * There is no mock/demo fallback: a missing key must fail closed in every
 * environment, so a donor can never believe a donation went through when no
 * real charge was ever attempted.
 */
export class MaketouNotConfiguredError extends Error {
  constructor(message = 'Maketou is not configured (MAKETOU_API_KEY missing)') {
    super(message);
    this.name = 'MaketouNotConfiguredError';
  }
}

export class MaketouRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'MaketouRequestError';
  }
}

export class MaketouRateLimitedError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super('Maketou rate limit exceeded');
    this.name = 'MaketouRateLimitedError';
  }
}

export class MaketouClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || process.env.MAKETOU_API_KEY || '';
    this.apiUrl = (apiUrl || process.env.MAKETOU_API_URL || 'https://api.maketou.net').replace(
      /\/$/,
      '',
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async createCart(input: CreateCartInput): Promise<CreateCartResponse> {
    if (!this.apiKey) {
      throw new MaketouNotConfiguredError();
    }

    const payload = {
      productDocumentId: input.productDocumentId,
      email: input.email,
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      redirectURL: input.redirectUrl,
      ...(input.customerPrice !== undefined ? { customerPrice: input.customerPrice } : {}),
      ...(input.meta ? { meta: input.meta } : {}),
    };

    const res = await fetch(`${this.apiUrl}/api/v1/stores/cart/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}) as Record<string, unknown>);
      const code = typeof errBody.code === 'string' ? errBody.code : undefined;
      const message = typeof errBody.message === 'string' ? errBody.message : res.statusText;
      throw new MaketouRequestError(
        `Maketou createCart failed (${res.status}): ${message}`,
        res.status,
        code,
      );
    }

    const json = await res.json();
    return {
      cart: { id: json.cart.id, status: json.cart.status },
      redirectUrl: json.redirectUrl,
    };
  }

  async getCart(cartId: string): Promise<MaketouCartStatus> {
    if (!this.apiKey) {
      throw new MaketouNotConfiguredError();
    }

    const res = await fetch(`${this.apiUrl}/api/v1/stores/cart/${cartId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 5000;
      throw new MaketouRateLimitedError(Number.isFinite(retryAfterMs) ? retryAfterMs : 5000);
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}) as Record<string, unknown>);
      const code = typeof errBody.code === 'string' ? errBody.code : undefined;
      const message = typeof errBody.message === 'string' ? errBody.message : res.statusText;
      throw new MaketouRequestError(
        `Maketou getCart failed (${res.status}): ${message}`,
        res.status,
        code,
      );
    }

    const json = await res.json();
    const rawStatus = json.status || json.cart?.status || 'waiting_payment';
    return {
      status: mapMaketouStatus(rawStatus),
      rawStatus,
    };
  }
}

export const maketou = new MaketouClient();
