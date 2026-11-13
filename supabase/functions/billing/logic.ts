/**
 * Pure payment rules shared by the billing function, the webhook and the unit tests.
 * No network, no secrets: everything here can be tested offline.
 */
export const PLANS = {
  monthly: { amountPaise: 14900, months: 1 },
  yearly: { amountPaise: 119900, months: 12 },
} as const;
export type PlanId = keyof typeof PLANS;
export const CURRENCY = 'INR';

export function isPlan(v: unknown): v is PlanId {
  return v === 'monthly' || v === 'yearly';
}

/** Razorpay ids are short ASCII tokens; anything else is rejected before it reaches a query or a signature. */
export function isProviderId(v: unknown, prefix: 'order_' | 'pay_'): v is string {
  return typeof v === 'string' && v.startsWith(prefix) && /^[A-Za-z0-9_]{8,64}$/.test(v);
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparison that takes the same time whether or not the strings match. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout success: Razorpay signs "<order_id>|<payment_id>" with the key secret. */
export async function verifyPaymentSignature(orderId: string, paymentId: string, signature: unknown, keySecret: string): Promise<boolean> {
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return safeEqual(await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** Webhook: Razorpay signs the exact raw request body with the webhook secret. */
export async function verifyWebhookSignature(rawBody: string, signature: string | null, webhookSecret: string): Promise<boolean> {
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return safeEqual(await hmacSha256Hex(webhookSecret, rawBody), signature);
}

export interface WebhookAction {
  kind: 'activate' | 'refund' | 'ignore';
  orderId?: string;
  paymentId?: string;
}

/** Decides what a verified webhook event means. Unknown events are ignored, never guessed at. */
export function webhookAction(event: unknown): WebhookAction {
  const e = (event ?? {}) as { event?: unknown; payload?: { payment?: { entity?: Record<string, unknown> }; refund?: { entity?: Record<string, unknown> } } };
  const payment = e.payload?.payment?.entity;
  if (e.event === 'payment.captured' || e.event === 'order.paid') {
    if (payment && payment.status === 'captured' && isProviderId(payment.order_id, 'order_') && isProviderId(payment.id, 'pay_')) {
      return { kind: 'activate', orderId: payment.order_id, paymentId: payment.id };
    }
    return { kind: 'ignore' };
  }
  if (e.event === 'refund.processed') {
    const paymentId = e.payload?.refund?.entity?.payment_id ?? payment?.id;
    return isProviderId(paymentId, 'pay_') ? { kind: 'refund', paymentId } : { kind: 'ignore' };
  }
  return { kind: 'ignore' };
}

/** A Razorpay order counts as paid only if it is fully paid for the amount we asked. */
export function orderIsPaid(order: unknown, expectedPaise: number): boolean {
  const o = (order ?? {}) as Record<string, unknown>;
  return o.status === 'paid' && o.amount === expectedPaise && o.amount_paid === expectedPaise && o.currency === CURRENCY;
}
