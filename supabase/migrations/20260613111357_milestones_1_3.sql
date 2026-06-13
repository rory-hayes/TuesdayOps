create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#7C6CF2',
  plan text not null default 'starter',
  billing_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agencies_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (agency_id, user_id),
  constraint memberships_role_check check (role in ('owner', 'admin', 'member', 'viewer'))
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  slug text not null,
  industry text not null default 'Unspecified',
  logo_url text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  report_recipient_email text not null,
  report_cadence text not null default 'monthly',
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug),
  unique (id, agency_id),
  constraint clients_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint clients_report_cadence_check check (report_cadence in ('monthly'))
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null,
  name text not null,
  type text not null default 'http_endpoint',
  environment text not null default 'production',
  endpoint_url text not null,
  method text not null default 'GET',
  auth_type text not null default 'none',
  encrypted_auth_config jsonb,
  check_frequency_minutes integer not null default 60,
  status text not null default 'unknown',
  pass_rate numeric not null default 0,
  latency_ms integer not null default 0,
  monthly_cost numeric not null default 0,
  last_check_at timestamptz,
  included_in_reports boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint workflows_client_agency_fk foreign key (client_id, agency_id)
    references public.clients(id, agency_id) on delete cascade,
  constraint workflows_type_check check (
    type in ('http_endpoint', 'webhook', 'n8n', 'make', 'zapier', 'mcp_server', 'custom_api', 'manual_log')
  ),
  constraint workflows_environment_check check (environment in ('production', 'staging', 'development')),
  constraint workflows_method_check check (method in ('GET', 'POST', 'PUT', 'PATCH')),
  constraint workflows_auth_type_check check (auth_type in ('none', 'bearer', 'api_key_header', 'basic')),
  constraint workflows_status_check check (status in ('healthy', 'degraded', 'failed', 'unknown')),
  constraint workflows_check_frequency_check check (check_frequency_minutes between 5 and 10080)
);

create table public.checks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  workflow_id uuid not null,
  name text not null,
  type text not null default 'health',
  config_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  schedule text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint checks_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade,
  constraint checks_type_check check (type in ('health', 'synthetic', 'schema', 'latency', 'cost', 'ai_judge'))
);

create table public.check_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null,
  workflow_id uuid not null,
  check_id uuid not null,
  status text not null,
  status_code integer,
  latency_ms integer not null default 0,
  response_summary text not null default '',
  assertion_results_json jsonb not null default '[]'::jsonb,
  error_message text,
  cost_estimate numeric,
  model text,
  prompt_version text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint check_runs_client_agency_fk foreign key (client_id, agency_id)
    references public.clients(id, agency_id) on delete cascade,
  constraint check_runs_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade,
  constraint check_runs_check_agency_fk foreign key (check_id, agency_id)
    references public.checks(id, agency_id) on delete cascade,
  constraint check_runs_status_check check (status in ('healthy', 'degraded', 'failed', 'skipped'))
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null,
  workflow_id uuid not null,
  check_run_id uuid references public.check_runs(id) on delete set null,
  severity text not null default 'medium',
  status text not null default 'open',
  title text not null,
  description text not null,
  suggested_action text not null,
  owner_user_id uuid references public.profiles(id) on delete set null,
  reportable boolean not null default true,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issues_client_agency_fk foreign key (client_id, agency_id)
    references public.clients(id, agency_id) on delete cascade,
  constraint issues_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade,
  constraint issues_severity_check check (severity in ('low', 'medium', 'high', 'critical')),
  constraint issues_status_check check (status in ('open', 'in_review', 'resolved', 'ignored'))
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_agency_id_idx on public.memberships(agency_id);
create index clients_agency_id_idx on public.clients(agency_id);
create index clients_archived_at_idx on public.clients(archived_at);
create index workflows_agency_id_idx on public.workflows(agency_id);
create index workflows_client_id_idx on public.workflows(client_id);
create index checks_agency_id_idx on public.checks(agency_id);
create index checks_workflow_id_idx on public.checks(workflow_id);
create index check_runs_agency_id_created_at_idx on public.check_runs(agency_id, created_at desc);
create index check_runs_check_id_created_at_idx on public.check_runs(check_id, created_at desc);
create index issues_agency_id_status_idx on public.issues(agency_id, status);
create index issues_workflow_id_status_idx on public.issues(workflow_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger agencies_set_updated_at
before update on public.agencies
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger workflows_set_updated_at
before update on public.workflows
for each row execute function public.set_updated_at();

create trigger checks_set_updated_at
before update on public.checks
for each row execute function public.set_updated_at();

create trigger issues_set_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_agency_member(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where memberships.agency_id = target_agency_id
      and memberships.user_id = auth.uid()
  );
$$;

create or replace function public.has_agency_role(target_agency_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where memberships.agency_id = target_agency_id
      and memberships.user_id = auth.uid()
      and memberships.role = any(allowed_roles)
  );
$$;

create or replace function public.create_agency_for_current_user(
  agency_name text,
  agency_slug text,
  agency_primary_color text default '#7C6CF2'
)
returns public.agencies
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := coalesce(auth.jwt() ->> 'email', 'unknown@example.invalid');
  created_agency public.agencies;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to create an agency.';
  end if;

  if agency_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Agency slug must be lowercase letters, numbers, and hyphens.';
  end if;

  insert into public.profiles (id, email, name)
  values (current_user_id, current_email, split_part(current_email, '@', 1))
  on conflict (id) do nothing;

  insert into public.agencies (name, slug, primary_color)
  values (agency_name, agency_slug, coalesce(nullif(agency_primary_color, ''), '#7C6CF2'))
  returning * into created_agency;

  insert into public.memberships (agency_id, user_id, role)
  values (created_agency.id, current_user_id, 'owner');

  return created_agency;
end;
$$;

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.workflows enable row level security;
alter table public.checks enable row level security;
alter table public.check_runs enable row level security;
alter table public.issues enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Agency members can read agencies"
on public.agencies
for select
to authenticated
using (public.is_agency_member(id));

create policy "Agency owners and admins can update agencies"
on public.agencies
for update
to authenticated
using (public.has_agency_role(id, array['owner', 'admin']))
with check (public.has_agency_role(id, array['owner', 'admin']));

create policy "Agency members can read memberships"
on public.memberships
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "Agency owners and admins can manage memberships"
on public.memberships
for all
to authenticated
using (public.has_agency_role(agency_id, array['owner', 'admin']))
with check (public.has_agency_role(agency_id, array['owner', 'admin']));

create policy "Agency members can manage clients"
on public.clients
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage workflows"
on public.workflows
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage checks"
on public.checks
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage check runs"
on public.check_runs
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage issues"
on public.issues
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.agencies,
  public.memberships,
  public.clients,
  public.workflows,
  public.checks,
  public.check_runs,
  public.issues
to authenticated;

grant execute on function public.create_agency_for_current_user(text, text, text) to authenticated;
