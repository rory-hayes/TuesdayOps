create table public.test_packs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  workflow_id uuid not null,
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint test_packs_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade
);

create table public.test_cases (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  workflow_id uuid not null,
  test_pack_id uuid not null,
  name text not null,
  input_json jsonb not null default '{}'::jsonb,
  expected_json jsonb,
  assertions_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint test_cases_pack_agency_fk foreign key (test_pack_id, agency_id)
    references public.test_packs(id, agency_id) on delete cascade,
  constraint test_cases_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade
);

create table public.test_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  workflow_id uuid not null,
  test_pack_id uuid not null,
  test_case_id uuid not null,
  status text not null,
  status_code integer,
  latency_ms integer not null default 0,
  response_summary text not null default '',
  assertion_results_json jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint test_runs_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade,
  constraint test_runs_pack_agency_fk foreign key (test_pack_id, agency_id)
    references public.test_packs(id, agency_id) on delete cascade,
  constraint test_runs_case_agency_fk foreign key (test_case_id, agency_id)
    references public.test_cases(id, agency_id) on delete cascade,
  constraint test_runs_status_check check (status in ('passed', 'failed', 'skipped'))
);

alter table public.issues
add column test_run_id uuid,
add constraint issues_test_run_agency_fk foreign key (test_run_id, agency_id)
  references public.test_runs(id, agency_id);

create index test_packs_agency_id_idx on public.test_packs(agency_id);
create index test_packs_workflow_id_idx on public.test_packs(workflow_id);
create index test_cases_agency_id_idx on public.test_cases(agency_id);
create index test_cases_pack_id_idx on public.test_cases(test_pack_id);
create index test_runs_agency_id_created_at_idx on public.test_runs(agency_id, created_at desc);
create index test_runs_pack_id_created_at_idx on public.test_runs(test_pack_id, created_at desc);
create index issues_test_run_id_idx on public.issues(test_run_id);

create trigger test_packs_set_updated_at
before update on public.test_packs
for each row execute function public.set_updated_at();

create trigger test_cases_set_updated_at
before update on public.test_cases
for each row execute function public.set_updated_at();

alter table public.test_packs enable row level security;
alter table public.test_cases enable row level security;
alter table public.test_runs enable row level security;

create policy "Agency members can manage test packs"
on public.test_packs
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage test cases"
on public.test_cases
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage test runs"
on public.test_runs
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

grant select, insert, update, delete on
  public.test_packs,
  public.test_cases,
  public.test_runs
to authenticated, service_role;
