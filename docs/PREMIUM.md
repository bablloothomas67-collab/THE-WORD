# Premium and payments (Phase 6)

## What the owner decided (13 Nov 2026)

- Price: Rs 149 for one month, Rs 1,199 for one year (server constants in `supabase/functions/billing/logic.ts`).
- Premium: Ask the Word 50 questions/day (free 5); devotional and prayer audio older than seven days
  (the current week is free); English audio of reading-plan chapters; premium Discover items; extra
  reading plans. Everything that exists today stays free.

## How payment works

1. `/premium` → "Get Premium" → the app asks the `billing` Edge Function for an order. The function
   takes the price from its own table, creates a Razorpay order and stores a `pending` row.
2. Razorpay Checkout opens (script loaded from checkout.razorpay.com only at that moment).
3. On success the app sends `{orderId, paymentId, signature}` back. The function checks that the order
   belongs to the caller, verifies the HMAC signature with the key secret, asks Razorpay whether the order
   is fully paid for the expected amount, then calls `activate_subscription`.
4. Razorpay also calls the same function as a webhook (signed with the webhook secret). This covers a
   browser that closed early, and refunds. Both paths are idempotent.

Purchases are **one-off periods, not auto-renewing subscriptions**. Buying again while Premium is running
adds the new period to the end. Auto-renewal (Razorpay Subscriptions / UPI AutoPay) can be added later; it
needs that product enabled on the owner's Razorpay account.

## Where access is enforced

| Feature | Enforced by |
|---|---|
| Ask limit | `ask-the-word` function reads `entitlements` (service role) |
| Premium Discover text | RLS on `content_localisations` |
| Premium plan days | RLS on `reading_plan_days` |
| Older devotional audio | RLS on `audio_tracks` (catalogue row hidden) |
| Plan chapter audio | private Storage bucket `premium-audio`; signed URLs only for subscribers |

The app's `usePremium()` only decides what to *offer*; it is never the protection.

## The paywall switch

`app_settings.paywall_live` starts `false`: nothing is locked for anyone. Turn it on only when live
payments work (SQL: `update public.app_settings set value = 'true' where key = 'paywall_live';`).
Clients cannot change it.

## Secrets (owner enters them in Supabase → Edge Functions → Secrets)

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Never in the repo or the browser.
The key id (public by design) is returned to signed-in users to open Checkout.
Webhook URL for the Razorpay dashboard: `https://qeyhpojsklbsutegchpz.supabase.co/functions/v1/billing`
(events: `payment.captured`, `order.paid`, `refund.processed`).

`billing` is deployed with `verify_jwt` off because Razorpay cannot send a user token; user actions check
the caller's token inside the function and the webhook path checks Razorpay's signature.

## Admin

`/admin` shows counts only (users, premium users, payments, content status, usage, recent audit actions)
through `admin_overview()`, which refuses anyone without the `admin` role. Grant:
`insert into public.admin_roles (user_id, role) select id, 'admin' from auth.users where email = '<owner email>';`

## Not done / known limits

- **Not tested against Razorpay**: no keys exist yet. Signature and decision logic is unit-tested with
  generated signatures; the deployed function is tested for refusing visitors, forged calls and
  unconfigured payments. A full test-mode purchase, a webhook delivery and a refund must be run once keys exist.
- `ask-the-word` in the repo has the 50/day premium limit but has **not been redeployed** yet.
- Devotional audio files are in a public bucket; older weeks are hidden by removing the catalogue row,
  so someone who already knows a file's address can still fetch it. Plan audio does not have this weakness.
- No invoices/GST handling, no coupons, no auto-renewal, no "expiring soon" reminder email.
- No plan-chapter audio exists yet (source: public-domain recordings, to be checked chapter by chapter).
- Legal pages in `docs/legal/` are drafts awaiting owner (and ideally lawyer) review; not yet on the site.
