# Iskra Exchange — Stripe + Supabase integration starter

This package adds account registration/login, a protected customer dashboard, embedded Stripe Checkout, a Stripe Billing Portal session function, and a signed webhook receiver. It is a **test-mode starter, not yet deployed or verified against your accounts**.

## 1. Configure browser Supabase settings

Edit `js/config.js` and replace:
- `https://qoeedfnttqejgqopgbmb.supabase.co` (already filled in for you)
- `REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY` with the public publishable/anon key

These are public browser values. Do not put a Stripe secret key or Supabase service-role key in this file.

## 2. Supabase Auth redirects

In Supabase → Authentication → URL Configuration:
- Site URL: `https://www.iskraexchange.cc`
- Add redirect URL: `https://www.iskraexchange.cc/auth/callback.html`

Enable Email provider and email confirmation. Confirm `auth/callback.html` is deployed at that exact path. For production delivery, configure custom SMTP.

## 3. Create test prices in Stripe

Use the Stripe **test/sandbox** dashboard and create recurring monthly prices:
- Monolith: USD 1,450/month
- Strata: USD 2,850/month
- Apex: USD 4,900/month

Copy each `price_...` ID. Do not use live price IDs in test mode. This package intentionally does not create or modify products in Stripe automatically.

## 4. Set Supabase Edge Function secrets

Set these server-side secrets in Supabase:
- `STRIPE_SECRET_KEY` = rotated Stripe test secret key
- `STRIPE_PUBLISHABLE_KEY` = Stripe test publishable key
- `STRIPE_PRICE_MONOLITH_MONTHLY` = Monolith recurring test price ID
- `STRIPE_PRICE_STRATA_MONTHLY` = Strata recurring test price ID
- `STRIPE_PRICE_APEX_MONTHLY` = Apex recurring test price ID
- `APP_URL` = `https://www.iskraexchange.cc`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` = Supabase server values (Supabase normally injects these into functions; confirm in your project)
- `STRIPE_WEBHOOK_SECRET` = signing secret shown after adding the webhook endpoint

Never share secrets in chat, commit them to Git, or place them in HTML/JavaScript. A previously exposed Stripe key should be rotated before use.

## 5. Database and deploy

Run `supabase/schema.sql` in the Supabase SQL Editor. Deploy the three functions:
- `create-checkout-session`
- `create-portal-session`
- `stripe-webhook`

This source includes `supabase/config.toml` with JWT verification disabled only for the webhook endpoint. The webhook verifies Stripe's signature itself.

Example CLI commands, from a configured Supabase CLI project:
```sh
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_PUBLISHABLE_KEY=... STRIPE_PRICE_MONOLITH_MONTHLY=... STRIPE_PRICE_STRATA_MONTHLY=... STRIPE_PRICE_APEX_MONTHLY=... APP_URL=https://www.iskraexchange.cc STRIPE_WEBHOOK_SECRET=...
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 6. Configure Stripe webhook in TEST mode

Add endpoint:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

Subscribe to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the test-mode endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

## 7. Test before live mode

1. Deploy site files to HTTPS hosting.
2. Sign up and verify email; confirm callback opens the dashboard.
3. Sign in and start a test subscription using Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, and a test postal code.
4. Confirm a subscription record is synchronized after webhook delivery.
5. Open Billing Portal and test cancellation/payment method updates.
6. Check Edge Function logs and Stripe webhook delivery logs.

## Important limitations before production

- This package has not been deployed, run, or verified against your actual Supabase project or Stripe account.
- Your Stripe MCP connection currently exposed only the live Iskra account in the latest check. Do not use it to make test setup changes; reconnect/authorize the sandbox account first.
- The dashboard currently starts checkout and provides a Billing Portal link. It does not yet render a subscription-history/status view from the database.
- Configure a production webhook retry/idempotency review, legal terms and cancellation/refund policies, SMTP, monitoring, and end-to-end tests before enabling live payments.
- Keep Iskra's consultation-first approval process if you need to scope and approve a client before activating a paid plan.
