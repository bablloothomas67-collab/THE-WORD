import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { screen } from '@testing-library/react';
import {
  hmacSha256Hex,
  isPlan,
  isProviderId,
  orderIsPaid,
  PLANS,
  safeEqual,
  verifyPaymentSignature,
  verifyWebhookSignature,
  webhookAction,
} from '../../supabase/functions/billing/logic';
import { DEFAULT_DAILY_LIMIT, PREMIUM_DAILY_LIMIT, REVIEWER_DAILY_LIMIT } from '../../supabase/functions/ask-the-word/logic';
import { formatRupees, isPremium, parseStatus } from '../../src/features/billing/billingService';
import { isCurrentWeek } from '../../src/features/devotionals/devotionalService';

const SECRET = 'test_secret_not_real';
const sign = (msg: string, secret = SECRET) => createHmac('sha256', secret).update(msg).digest('hex');

describe('payment rules (server)', () => {
  it('charges the owner-approved prices', () => {
    expect(PLANS.monthly.amountPaise).toBe(14900);
    expect(PLANS.yearly.amountPaise).toBe(119900);
    expect(isPlan('monthly') && isPlan('yearly')).toBe(true);
    expect(isPlan('lifetime') || isPlan(undefined)).toBe(false);
  });

  it('computes the same HMAC as Node and compares safely', async () => {
    expect(await hmacSha256Hex(SECRET, 'order_ABCDEFGH|pay_ABCDEFGH')).toBe(sign('order_ABCDEFGH|pay_ABCDEFGH'));
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('accepts only a payment signature made with the key secret for exactly this order and payment', async () => {
    const good = sign('order_ABCDEFGH12|pay_ABCDEFGH12');
    expect(await verifyPaymentSignature('order_ABCDEFGH12', 'pay_ABCDEFGH12', good, SECRET)).toBe(true);
    expect(await verifyPaymentSignature('order_ABCDEFGH99', 'pay_ABCDEFGH12', good, SECRET)).toBe(false);
    expect(await verifyPaymentSignature('order_ABCDEFGH12', 'pay_ABCDEFGH12', sign('order_ABCDEFGH12|pay_ABCDEFGH12', 'other'), SECRET)).toBe(false);
    expect(await verifyPaymentSignature('order_ABCDEFGH12', 'pay_ABCDEFGH12', good.toUpperCase(), SECRET)).toBe(false);
    expect(await verifyPaymentSignature('order_ABCDEFGH12', 'pay_ABCDEFGH12', undefined, SECRET)).toBe(false);
    expect(await verifyPaymentSignature('order_ABCDEFGH12', 'pay_ABCDEFGH12', '', SECRET)).toBe(false);
  });

  it('accepts a webhook only when the raw body is signed with the webhook secret', async () => {
    const body = '{"event":"payment.captured"}';
    expect(await verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
    expect(await verifyWebhookSignature(body + ' ', sign(body), SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, 'not-a-signature', SECRET)).toBe(false);
  });

  it('rejects ids that are not Razorpay tokens', () => {
    expect(isProviderId('order_Nabc123XYZ', 'order_')).toBe(true);
    expect(isProviderId('pay_Nabc123XYZ', 'order_')).toBe(false);
    expect(isProviderId("order_x'; drop table", 'order_')).toBe(false);
    expect(isProviderId('order_', 'order_')).toBe(false);
    expect(isProviderId(42, 'pay_')).toBe(false);
  });

  it('turns verified events into actions and ignores everything else', () => {
    const payment = { id: 'pay_ABCDEFGH12', order_id: 'order_ABCDEFGH12', status: 'captured' };
    expect(webhookAction({ event: 'payment.captured', payload: { payment: { entity: payment } } })).toEqual({
      kind: 'activate',
      orderId: 'order_ABCDEFGH12',
      paymentId: 'pay_ABCDEFGH12',
    });
    expect(webhookAction({ event: 'payment.captured', payload: { payment: { entity: { ...payment, status: 'failed' } } } }).kind).toBe('ignore');
    expect(webhookAction({ event: 'payment.failed', payload: { payment: { entity: payment } } }).kind).toBe('ignore');
    expect(webhookAction({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_ABCDEFGH12' } } } })).toEqual({
      kind: 'refund',
      paymentId: 'pay_ABCDEFGH12',
    });
    expect(webhookAction({ event: 'refund.processed', payload: {} }).kind).toBe('ignore');
    expect(webhookAction(null).kind).toBe('ignore');
  });

  it('treats an order as paid only when fully paid for the expected amount in rupees', () => {
    const paid = { status: 'paid', amount: 14900, amount_paid: 14900, currency: 'INR' };
    expect(orderIsPaid(paid, 14900)).toBe(true);
    expect(orderIsPaid({ ...paid, status: 'attempted' }, 14900)).toBe(false);
    expect(orderIsPaid({ ...paid, amount_paid: 100 }, 14900)).toBe(false);
    expect(orderIsPaid(paid, 119900)).toBe(false);
    expect(orderIsPaid({ ...paid, currency: 'USD' }, 14900)).toBe(false);
    expect(orderIsPaid(undefined, 14900)).toBe(false);
  });

  it('gives subscribers a higher Ask the Word limit than free readers', () => {
    expect(DEFAULT_DAILY_LIMIT).toBe(5);
    expect(PREMIUM_DAILY_LIMIT).toBe(50);
    expect(REVIEWER_DAILY_LIMIT).toBeGreaterThan(PREMIUM_DAILY_LIMIT);
  });
});

describe('premium state (app)', () => {
  it('is premium only until the stored date', () => {
    const now = new Date('2026-11-13T00:00:00Z');
    expect(isPremium({ premiumUntil: '2026-12-13T00:00:00Z' }, now)).toBe(true);
    expect(isPremium({ premiumUntil: '2026-11-12T23:59:59Z' }, now)).toBe(false);
    expect(isPremium({ premiumUntil: null }, now)).toBe(false);
    expect(isPremium(undefined, now)).toBe(false);
  });

  it('formats rupee prices', () => {
    expect(formatRupees(14900, 'en')).toBe('₹149');
    expect(formatRupees(119900, 'en')).toBe('₹1,199');
    expect(formatRupees(14950, 'en')).toBe('₹149.50');
  });

  it('reads the server status and refuses a status without valid prices', () => {
    expect(parseStatus({ configured: false, keyId: null, plans: { monthly: { amountPaise: 14900 }, yearly: { amountPaise: 119900 } } })).toEqual({
      configured: false,
      keyId: null,
      plans: { monthly: { amountPaise: 14900 }, yearly: { amountPaise: 119900 } },
    });
    expect(() => parseStatus({ configured: true, plans: { monthly: { amountPaise: 0 } } })).toThrow();
    expect(() => parseStatus(null)).toThrow();
  });

  it('keeps devotional audio free for seven days from publication', () => {
    const today = new Date('2026-11-20T10:00:00Z');
    expect(isCurrentWeek('2026-11-20', today)).toBe(true);
    expect(isCurrentWeek('2026-11-14', today)).toBe(true);
    expect(isCurrentWeek('2026-11-13', today)).toBe(false);
    expect(isCurrentWeek('not-a-date', today)).toBe(false);
  });
});

const mocks = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  premiumState: vi.fn(),
  paywallLive: vi.fn(),
  status: vi.fn(),
  createOrder: vi.fn(),
  adminOverview: vi.fn(),
}));
vi.mock('../../src/features/auth/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, isConfigured: true }),
}));
vi.mock('../../src/features/billing/billingService', async (original) => ({
  ...(await original<typeof import('../../src/features/billing/billingService')>()),
  billingService: {
    premiumState: mocks.premiumState,
    paywallLive: mocks.paywallLive,
    status: mocks.status,
    createOrder: mocks.createOrder,
    verify: vi.fn(),
    isAdmin: vi.fn().mockResolvedValue(false),
    adminOverview: mocks.adminOverview,
  },
}));

describe('Premium and admin pages', () => {
  const plans = { monthly: { amountPaise: 14900 }, yearly: { amountPaise: 119900 } };
  beforeEach(() => {
    mocks.user = null;
    mocks.paywallLive.mockReset().mockResolvedValue(false);
    mocks.premiumState.mockReset().mockResolvedValue({ premiumUntil: null, paywallLive: false });
    mocks.status.mockReset().mockResolvedValue({ configured: false, keyId: null, plans });
    mocks.createOrder.mockReset();
    mocks.adminOverview.mockReset();
  });
  async function renderAt(route: string) {
    const { renderApp } = await import('../renderApp');
    return renderApp(route);
  }

  it('shows visitors the prices and asks them to sign in; no payment call is made', async () => {
    await renderAt('/premium');
    expect(await screen.findByRole('heading', { level: 1, name: 'THE WORD Premium' })).toBeInTheDocument();
    expect(screen.getByText('₹149')).toBeInTheDocument();
    expect(screen.getByText('₹1,199')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in to get Premium' })).toHaveLength(2);
    expect(mocks.status).not.toHaveBeenCalled();
  });

  it('disables buying and says so while payments are not open', async () => {
    mocks.user = { id: 'u1', email: 'a@b.c' };
    await renderAt('/premium');
    expect(await screen.findByText('Payments are not open yet. Nothing is locked in the meantime.')).toBeInTheDocument();
    for (const b of screen.getAllByRole('button', { name: 'Get Premium' })) expect(b).toBeDisabled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('shows a subscriber their expiry date and offers to add time', async () => {
    mocks.user = { id: 'u1', email: 'a@b.c' };
    mocks.premiumState.mockResolvedValue({ premiumUntil: '2099-01-15T00:00:00Z', paywallLive: true });
    mocks.status.mockResolvedValue({ configured: true, keyId: 'rzp_test_x', plans });
    await renderAt('/premium');
    expect(await screen.findByText('You have Premium.')).toBeInTheDocument();
    expect(screen.getByText(/Valid until .*2099/)).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: 'Add more time' })).toHaveLength(2);
  });

  it('refuses the admin page when the database refuses the caller', async () => {
    mocks.user = { id: 'u1', email: 'a@b.c' };
    mocks.adminOverview.mockRejectedValue(new Error('not authorised'));
    await renderAt('/admin');
    expect(await screen.findByText('This page is only for administrators.')).toBeInTheDocument();
  });

  it('shows the admin numbers when allowed', async () => {
    mocks.user = { id: 'u1', email: 'a@b.c' };
    mocks.adminOverview.mockResolvedValue({ users: 12, users_last_7_days: 3, premium_users: 2, paywall_live: false, revenue_paise: 29800, subscriptions: { active: 2 }, content: { 'story:published': 6 }, devotionals: { published: 14 }, ask_questions_last_7_days: 40, audio_tracks: 232, recent_audit: [] });
    await renderAt('/admin');
    expect(await screen.findByText('Premium locks are OFF (everything is open).')).toBeInTheDocument();
    expect(screen.getByText(/₹298/)).toBeInTheDocument();
    expect(screen.getByText('story:published')).toBeInTheDocument();
  });
});
