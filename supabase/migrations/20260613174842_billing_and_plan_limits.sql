alter table public.agencies
add column billing_subscription_id text,
add column billing_status text not null default 'trialing',
add column billing_price_id text,
add column billing_current_period_end timestamptz,
add column trial_ends_at timestamptz not null default (now() + interval '14 days'),
add constraint agencies_billing_status_check
  check (billing_status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete'));

create index agencies_billing_customer_id_idx
on public.agencies(billing_customer_id)
where billing_customer_id is not null;

create index agencies_billing_subscription_id_idx
on public.agencies(billing_subscription_id)
where billing_subscription_id is not null;

create table public.billing_events (
  id text primary key,
  agency_id uuid references public.agencies(id) on delete set null,
  type text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

grant select, insert on public.billing_events to service_role;
