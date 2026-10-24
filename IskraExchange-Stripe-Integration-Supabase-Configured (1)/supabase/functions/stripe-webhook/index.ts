import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return new Response('Missing Stripe-Signature', { status: 400 });
  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, cryptoProvider);
  } catch (e) {
    console.error('Webhook signature verification failed', e);
    return new Response('Invalid signature', { status: 400 });
  }
  const { data: existing } = await supabaseAdmin.from('stripe_webhook_events').select('event_id').eq('event_id', event.id).maybeSingle();
  if (existing) return new Response('Already processed', { status: 200 });
  try {
    if (event.type.startsWith('customer.subscription.')) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const { data: mapping } = await supabaseAdmin.from('stripe_customers').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
      const userId = sub.metadata.supabase_user_id ?? mapping?.user_id;
      if (userId) {
        const firstItem = sub.items.data[0];
        await supabaseAdmin.from('stripe_subscriptions').upsert({
          stripe_subscription_id: sub.id, user_id: userId, stripe_customer_id: customerId,
          status: sub.status, price_id: firstItem?.price.id ?? null,
          current_period_end: firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end, updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
      }
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer && session.client_reference_id) {
        await supabaseAdmin.from('stripe_customers').upsert({ user_id: session.client_reference_id, stripe_customer_id: String(session.customer) }, { onConflict: 'user_id' });
      }
    }
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      // Subscription status remains authoritative from customer.subscription.* events.
      console.log(`Received ${event.type}; event ${event.id}`);
    }
    const { error: insertError } = await supabaseAdmin.from('stripe_webhook_events').insert({ event_id: event.id, event_type: event.type });
    if (insertError && insertError.code !== '23505') throw insertError;
    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('Webhook processing failed', e);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
