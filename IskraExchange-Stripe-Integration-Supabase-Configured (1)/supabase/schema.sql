-- Run in Supabase SQL Editor. This schema stores customer mapping and subscription state.
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now()
);
create table if not exists public.stripe_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;
drop policy if exists "Read own Stripe customer" on public.stripe_customers;
create policy "Read own Stripe customer" on public.stripe_customers for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Read own subscriptions" on public.stripe_subscriptions;
create policy "Read own subscriptions" on public.stripe_subscriptions for select to authenticated using (auth.uid() = user_id);
-- No client-facing write policies: writes are restricted to Edge Functions using the service-role key.
