/**
 * Razorpay webhook: called by Razorpay when a payment is captured or refunded.
 * It is the safety net for a browser that closed before confirming a payment.
 *
 * There is no user login on this path: the caller is authenticated by the
 * X-Razorpay-Signature header, an HMAC of the exact raw body made with
 * RAZORPAY_WEBHOOK_SECRET. Unsigned or wrongly signed requests change nothing.
 */
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { verifyWebhookSignature, webhookAction } from './logic.ts';

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleWebhook(req: Request, admin: SupabaseClient): Promise<Response> {
  if (!WEBHOOK_SECRET) return reply(503, { code: 'not_configured' });

  const raw = await req.text();
  if (raw.length > 100_000) return reply(413, { code: 'too_large' });
  if (!(await verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'), WEBHOOK_SECRET))) {
    return reply(401, { code: 'bad_signature' });
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return reply(400, { code: 'invalid_request' });
  }
  const action = webhookAction(event);
  const eventId = req.headers.get('x-razorpay-event-id') ?? '';
  if (action.kind === 'ignore' || !/^[A-Za-z0-9_-]{6,80}$/.test(eventId)) return reply(200, { handled: false });

  try {
    if (action.kind === 'activate') {
      // An order we did not create is not ours to activate.
      const { data: sub, error } = await admin.from('subscriptions').select('status').eq('provider_order_id', action.orderId!).maybeSingle();
      if (error) throw new Error(`lookup: ${error.message}`);
      if (!sub) return reply(200, { handled: false });
      const { error: rpcError } = await admin.rpc('activate_subscription', { p_order_id: action.orderId!, p_payment_id: action.paymentId! });
      if (rpcError) throw new Error(`activate: ${rpcError.message}`);
    } else {
      const { error: rpcError } = await admin.rpc('refund_subscription', { p_payment_id: action.paymentId! });
      if (rpcError) throw new Error(`refund: ${rpcError.message}`);
    }
    // Recorded only after success, so a failed delivery is retried by Razorpay and handled then.
    const { error: logError } = await admin
      .from('payment_events')
      .upsert({ provider_event_id: eventId, event_type: action.kind, provider_order_id: action.orderId ?? null }, { onConflict: 'provider_event_id', ignoreDuplicates: true });
    if (logError) throw new Error(`log: ${logError.message}`);
    return reply(200, { handled: true });
  } catch (err) {
    console.error('razorpay-webhook:', err instanceof Error ? err.message : 'unknown error');
    return reply(500, { code: 'retry' });
  }
}
