import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';

/**
 * THE WORD Premium. Prices, orders and payment confirmation all live in the
 * server-side "billing" function; the browser only opens Razorpay Checkout and
 * hands the result back to be verified. Access itself is enforced by the database.
 */
export const PLAN_IDS = ['monthly', 'yearly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface BillingStatus {
  configured: boolean;
  keyId: string | null;
  plans: Record<PlanId, { amountPaise: number }>;
}

export interface Order {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

export interface CheckoutResult {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PremiumState {
  premiumUntil: string | null;
  paywallLive: boolean;
}

export type BillingErrorCode = 'auth' | 'not_configured' | 'too_many' | 'not_paid' | 'invalid' | 'unavailable' | 'checkout';
export class BillingError extends Error {
  code: BillingErrorCode;
  constructor(code: BillingErrorCode) {
    super(code);
    this.code = code;
  }
}

const STATUS_CODES: Record<number, BillingErrorCode> = { 401: 'auth', 503: 'not_configured', 429: 'too_many', 409: 'not_paid', 400: 'invalid', 404: 'invalid' };

export function isPremium(state: Pick<PremiumState, 'premiumUntil'> | undefined, now = new Date()): boolean {
  return Boolean(state?.premiumUntil && new Date(state.premiumUntil).getTime() > now.getTime());
}

/** "₹149" / "₹1,199" — whole rupees when there are no paise. */
export function formatRupees(paise: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-IN`, { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);
}

type Row = Record<string, unknown>;

export function parseStatus(v: unknown): BillingStatus {
  const o = (v ?? {}) as Row;
  const plans = (o.plans ?? {}) as Record<string, Row>;
  const amount = (id: PlanId) => {
    const n = Number(plans[id]?.amountPaise);
    if (!Number.isInteger(n) || n <= 0) throw new BillingError('unavailable');
    return { amountPaise: n };
  };
  return { configured: o.configured === true, keyId: typeof o.keyId === 'string' ? o.keyId : null, plans: { monthly: amount('monthly'), yearly: amount('yearly') } };
}

export function createBillingService(client: SupabaseClient | null = defaultClient) {
  function db(): SupabaseClient {
    if (!client) throw new BillingError('unavailable');
    return client;
  }
  async function call(body: Record<string, unknown>): Promise<Row> {
    const { data, error } = await db().functions.invoke('billing', { body });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      throw new BillingError((status && STATUS_CODES[status]) || 'unavailable');
    }
    return (data ?? {}) as Row;
  }

  return {
    /** What the signed-in user has, read straight from their own rows (RLS). */
    async premiumState(): Promise<PremiumState> {
      const [ent, setting] = await Promise.all([
        db().from('entitlements').select('premium_until').maybeSingle(),
        db().from('app_settings').select('value').eq('key', 'paywall_live').maybeSingle(),
      ]);
      if (ent.error) throw new Error(`Load entitlement: ${ent.error.message}`);
      if (setting.error) throw new Error(`Load settings: ${setting.error.message}`);
      const until = (ent.data as Row | null)?.premium_until;
      return { premiumUntil: typeof until === 'string' ? until : null, paywallLive: (setting.data as Row | null)?.value === true };
    },

    /** Visitors can still see whether premium locks are switched on. */
    async paywallLive(): Promise<boolean> {
      const { data, error } = await db().from('app_settings').select('value').eq('key', 'paywall_live').maybeSingle();
      if (error) throw new Error(`Load settings: ${error.message}`);
      return (data as Row | null)?.value === true;
    },

    async status(): Promise<BillingStatus> {
      return parseStatus(await call({ action: 'status' }));
    },

    async createOrder(plan: PlanId): Promise<Order> {
      const o = await call({ action: 'create_order', plan });
      if (typeof o.orderId !== 'string' || typeof o.keyId !== 'string' || typeof o.amountPaise !== 'number') throw new BillingError('unavailable');
      return { orderId: o.orderId, keyId: o.keyId, amountPaise: o.amountPaise, currency: String(o.currency ?? 'INR') };
    },

    async verify(result: CheckoutResult): Promise<string> {
      const o = await call({ action: 'verify', ...result });
      if (typeof o.premiumUntil !== 'string') throw new BillingError('unavailable');
      return o.premiumUntil;
    },

    async isAdmin(): Promise<boolean> {
      const { data, error } = await db().from('admin_roles').select('role').eq('role', 'admin');
      if (error) throw new Error(`Load roles: ${error.message}`);
      return (data ?? []).length > 0;
    },

    async adminOverview(): Promise<Row> {
      const { data, error } = await db().rpc('admin_overview');
      if (error) throw new Error(`Admin overview: ${error.message}`);
      return (data ?? {}) as Row;
    },
  };
}

export const billingService = createBillingService();

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
interface RazorpayWindow {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
}
let checkoutLoading: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve();
  checkoutLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve();
    s.onerror = () => {
      checkoutLoading = null;
      reject(new BillingError('checkout'));
    };
    document.head.appendChild(s);
  });
  return checkoutLoading;
}

/** Opens Razorpay Checkout for an order. Resolves with the signed result, or null if the user closed it. */
export async function openCheckout(order: Order, opts: { name: string; description: string; email?: string }): Promise<CheckoutResult | null> {
  await loadCheckout();
  const Razorpay = (window as RazorpayWindow).Razorpay;
  if (!Razorpay) throw new BillingError('checkout');
  return new Promise((resolve) => {
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: opts.name,
      description: opts.description,
      prefill: opts.email ? { email: opts.email } : undefined,
      theme: { color: '#14284b' },
      handler: (r: Record<string, string>) =>
        resolve({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}
