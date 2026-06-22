create table if not exists public.workflow_imports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  workflow_id uuid not null,
  source_type text not null,
  source_name text not null,
  source_hash text not null,
  normalized_json jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint workflow_imports_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade,
  constraint workflow_imports_source_type_check check (
    source_type in ('url', 'curl', 'openapi', 'postman', 'n8n_json', 'make_blueprint', 'zapier_json')
  )
);

alter table public.workflow_imports enable row level security;

create policy "Agency members can read workflow imports"
on public.workflow_imports
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "Agency members can create workflow imports"
on public.workflow_imports
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage workflow imports"
on public.workflow_imports
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

grant select, insert, update on public.workflow_imports to authenticated;
grant select, insert, update on public.workflow_imports to service_role;

create index if not exists workflow_imports_agency_workflow_idx
on public.workflow_imports(agency_id, workflow_id, created_at desc);

create index if not exists workflow_imports_source_type_idx
on public.workflow_imports(agency_id, source_type, created_at desc);
