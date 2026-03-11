-- RoleOS Cloud commercial baseline schema for Supabase Postgres

create table if not exists public.users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null
);

create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  created_at timestamptz not null
);

create table if not exists public.workspace_members (
  workspace_id text not null,
  user_id text not null,
  role text not null,
  created_at timestamptz not null,
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_state (
  workspace_id text primary key,
  default_role_id text not null,
  default_kit_id text not null,
  default_team_id text not null,
  active_kit_id text not null,
  model_policy_name text not null
);

create table if not exists public.plans (
  code text primary key,
  name text not null,
  monthly_price_usd numeric(12, 2) not null,
  monthly_run_limit integer not null,
  included_cost_usd numeric(12, 4) not null,
  overage_multiplier numeric(8, 4) not null,
  is_active boolean not null default true
);

create table if not exists public.workspace_subscriptions (
  workspace_id text primary key,
  plan_code text not null references public.plans(code),
  status text not null,
  starts_at timestamptz not null,
  renews_at timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.runs (
  id text primary key,
  workspace_id text not null,
  source text not null,
  role_id text not null,
  kit_id text not null,
  team_id text,
  input text not null,
  output text not null,
  status text not null,
  retry_count integer not null default 0,
  cost numeric(18, 6) not null,
  trace_json jsonb not null,
  error text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.billing_charges (
  id text primary key,
  workspace_id text not null,
  run_id text not null references public.runs(id),
  charge_month text not null,
  usage_cost_usd numeric(18, 6) not null,
  variable_revenue_usd numeric(18, 6) not null,
  charged_at timestamptz not null
);

create table if not exists public.idempotency_keys (
  workspace_id text not null,
  idempotency_key text not null,
  run_id text not null references public.runs(id),
  created_at timestamptz not null,
  primary key (workspace_id, idempotency_key)
);

create table if not exists public.payment_orders (
  id text primary key,
  workspace_id text not null,
  plan_code text not null references public.plans(code),
  provider text not null,
  provider_order_id text not null,
  amount_usd numeric(12, 2) not null,
  status text not null,
  checkout_url text not null,
  metadata_json jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.self_hosted_entitlements (
  id text primary key,
  workspace_id text not null unique,
  package_code text not null,
  status text not null,
  order_id text,
  activated_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.audit_events (
  id text primary key,
  workspace_id text not null,
  type text not null,
  message text not null,
  metadata_json jsonb,
  created_at timestamptz not null
);

insert into public.plans (
  code, name, monthly_price_usd, monthly_run_limit, included_cost_usd, overage_multiplier, is_active
)
values
  ('trial', 'Trial', 0, 3, 0.2, 2.0, true),
  ('starter', 'Starter', 29, 800, 6, 1.6, true),
  ('pro', 'Pro', 199, 6000, 40, 1.4, true),
  ('business', 'Business', 799, 50000, 300, 1.25, true),
  ('enterprise', 'Enterprise', 2499, 500000, 1800, 1.1, true),
  ('rs-self-hosted', 'RS Self-Hosted', 199, 0, 0, 1, false)
on conflict (code) do update set
  name = excluded.name,
  monthly_price_usd = excluded.monthly_price_usd,
  monthly_run_limit = excluded.monthly_run_limit,
  included_cost_usd = excluded.included_cost_usd,
  overage_multiplier = excluded.overage_multiplier,
  is_active = excluded.is_active;

create index if not exists idx_runs_workspace_month on public.runs (workspace_id, created_at);
create index if not exists idx_charges_workspace_month on public.billing_charges (workspace_id, charge_month);
create index if not exists idx_subscriptions_status on public.workspace_subscriptions (status);
create index if not exists idx_payment_orders_status_created_at on public.payment_orders (status, created_at);
create index if not exists idx_self_hosted_entitlements_workspace on public.self_hosted_entitlements (workspace_id);
create unique index if not exists idx_payment_orders_provider_order on public.payment_orders (provider, provider_order_id);
