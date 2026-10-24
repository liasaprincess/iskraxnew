import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' });
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Sign in required.' }, { status: 401, headers: corsHeaders });
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return Response.json({ error: 'Invalid session.' }, { status: 401, headers: corsHeaders });
    const { data: mapping } = await supabaseAdmin.from('stripe_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    if (!mapping?.stripe_customer_id) return Response.json({ error: 'No billing profile exists yet. Subscribe to a plan first.' }, { status: 404, headers: corsHeaders });
    const session = await stripe.billingPortal.sessions.create({ customer: mapping.stripe_customer_id, return_url: `${Deno.env.get('APP_URL')}/dashboard.html` });
    return Response.json({ url: session.url }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('create-portal-session failed', e);
    return Response.json({ error: 'Unable to open the billing portal.' }, { status: 500, headers: corsHeaders });
  }
});
