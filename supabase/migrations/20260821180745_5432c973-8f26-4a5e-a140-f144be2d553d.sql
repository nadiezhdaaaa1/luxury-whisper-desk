create table public.stripe_events (
  event_id    text primary key,
  type        text not null,
  received_at timestamptz not null default now(),
  payload     jsonb not null
);

comment on table public.stripe_events is
  'Webhook idempotency ledger. Stripe retries failed deliveries and can redeliver the same event more than once, so every event id is inserted here first with ON CONFLICT DO NOTHING; no row returned means the event was already processed. Service role only — no anon/authenticated policies.';

grant all on public.stripe_events to service_role;

alter table public.stripe_events enable row level security;
-- Deliberately no policies for anon/authenticated: only the service role
-- (the webhook handler) may read or write this table.