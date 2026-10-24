import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' });
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const plans: Record<string, string | undefined> = {
  monolith: Deno.env.get('STRIPE_PRICE_MONOLITH_MONTHLY'),
  strata: Deno.env.get('STRIPE_PRICE_STRATA_MONTHLY'),
  apex: Deno.env.get('STRIPE_PRICE_APEX_MONTHLY'),
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Sign in required.' }, { status: 401, headers: corsHeaders });
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return Response.json({ error: 'Invalid session. Please sign in again.' }, { status: 401, headers: corsHeaders });
    const body = await req.json();
    const plan = String(body.plan ?? '').toLowerCase();
    const price = plans[plan];
    if (!price) return Response.json({ error: `The ${plan || 'selected'} plan is not configured yet. Add its Stripe recurring Price ID to Supabase secrets.` }, { status: 400, headers: corsHeaders });
    const { data: mapping } = await supabaseAdmin.from('stripe_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    let customerId = mapping?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } }, { idempotencyKey: `supabase-user-${user.id}` });
      customerId = customer.id;
      const { error: insertError } = await supabaseAdmin.from('stripe_customers').upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' });
      if (insertError) throw insertError;
    }
    const appUrl = Deno.env.get('APP_URL')!;
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', mode: 'subscription', customer: customerId,
      line_items: [{ price, quantity: 1 }],
      return_url: `${appUrl}/dashboard.html?checkout_session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
      allow_promotion_codes: false,
    });
    if (!session.client_secret) throw new Error('Stripe did not return an embedded Checkout client secret.');
    return Response.json({ clientSecret: session.client_secret, publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('create-checkout-session failed', e);
    return Response.json({ error: 'Unable to start checkout. Verify Stripe test keys, price IDs, and Supabase secrets.' }, { status: 500, headers: corsHeaders });
  }
});
