/**
 * billing — creates Razorpay orders and confirms payments for THE WORD Premium.
 *
 * Secrets (entered by the owner in Supabase, never in the app): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
 * Prices live here on the server; the browser never chooses an amount.
 * A payment only gives access after (1) Razorpay's signature checks out, (2) the order
 * belongs to the caller, and (3) Razorpay itself reports the order fully paid.
 *
 * Deployed with verify_jwt OFF because Razorpay's webhook cannot send a user token; every
 * user action below checks the caller's token itself, and the webhook path (webhook.ts)
 * checks Razorpay's signature. Extra secret for the webhook: RAZORPAY_WEBHOOK_SECRET.
 *
 * Actions (POST, signed-in users only):
 *   { action: 'status' }                              → { configured, keyId, plans }
 *   { action: 'create_order', plan }                  → { orderId, amountPaise, currency, keyId }
 *   { action: 'verify', orderId, paymentId, signature } → { premiumUntil }
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleWebhook } from './webhook.ts';
import { CURRENCY, isPlan, isProviderId, orderIsPaid, PLANS, verifyPaymentSignature } from './logic.ts';

const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const configured = KEY_ID.length > 0 && KEY_SECRET.length > 0;
const MAX_PENDING_PER_DAY = 10;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function razorpay(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`razorpay ${path.split('/')[1]} ${res.status}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Razorpay's server calls carry a signature header instead of a user login.
  if (req.headers.has('x-razorpay-signature')) return await handleWebhook(req, admin);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json(401, { code: 'unauthorised' });
  const userId = auth.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { code: 'invalid_request' });
  }

  try {
    if (body.action === 'status') {
      return json(200, { configured, keyId: configured ? KEY_ID : null, plans: PLANS, currency: CURRENCY });
    }
    if (!configured) return json(503, { code: 'not_configured' });

    if (body.action === 'create_order') {
      if (!isPlan(body.plan)) return json(400, { code: 'invalid_request' });
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count, error: countError } = await admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since);
      if (countError) throw new Error(`count: ${countError.message}`);
      if ((count ?? 0) >= MAX_PENDING_PER_DAY) return json(429, { code: 'too_many_orders' });

      const plan = PLANS[body.plan];
      const order = (await razorpay('/orders', {
        method: 'POST',
        body: JSON.stringify({
          amount: plan.amountPaise,
          currency: CURRENCY,
          receipt: crypto.randomUUID().replaceAll('-', ''),
          notes: { plan: body.plan },
        }),
      })) as { id?: unknown };
      if (!isProviderId(order.id, 'order_')) throw new Error('razorpay order id missing');
      const { error: insertError } = await admin.from('subscriptions').insert({
        user_id: userId,
        plan: body.plan,
        amount_paise: plan.amountPaise,
        provider_order_id: order.id,
      });
      if (insertError) throw new Error(`insert: ${insertError.message}`);
      return json(200, { orderId: order.id, amountPaise: plan.amountPaise, currency: CURRENCY, keyId: KEY_ID });
    }

    if (body.action === 'verify') {
      const { orderId, paymentId, signature } = body;
      if (!isProviderId(orderId, 'order_') || !isProviderId(paymentId, 'pay_')) return json(400, { code: 'invalid_request' });
      const { data: sub, error: subError } = await admin
        .from('subscriptions')
        .select('user_id, amount_paise')
        .eq('provider_order_id', orderId)
        .maybeSingle();
      if (subError) throw new Error(`lookup: ${subError.message}`);
      if (!sub || sub.user_id !== userId) return json(404, { code: 'not_found' });
      if (!(await verifyPaymentSignature(orderId, paymentId, signature, KEY_SECRET))) {
        console.warn('billing: bad payment signature');
        return json(400, { code: 'bad_signature' });
      }
      if (!orderIsPaid(await razorpay(`/orders/${orderId}`), sub.amount_paise)) return json(409, { code: 'not_paid' });
      const { data: result, error: rpcError } = await admin.rpc('activate_subscription', { p_order_id: orderId, p_payment_id: paymentId });
      if (rpcError) throw new Error(`activate: ${rpcError.message}`);
      return json(200, { premiumUntil: (result as { premium_until: string }).premium_until });
    }
    return json(400, { code: 'invalid_request' });
  } catch (err) {
    // Never log payment details or secrets: the error text above is deliberately generic.
    console.error('billing:', err instanceof Error ? err.message : 'unknown error');
    return json(502, { code: 'payment_unavailable' });
  }
});
