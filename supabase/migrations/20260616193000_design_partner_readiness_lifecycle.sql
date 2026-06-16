alter table public.workflows
add column if not exists archived_at timestamptz;

alter table public.test_cases
add column if not exists archived_at timestamptz;

alter table public.clients
add column if not exists report_automation_enabled boolean not null default false,
add column if not exists next_report_due_on date,
add column if not exists last_report_generated_at timestamptz;

create table if not exists public.workflow_api_keys (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  workflow_id uuid not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint workflow_api_keys_workflow_agency_fk foreign key (workflow_id, agency_id)
    references public.workflows(id, agency_id) on delete cascade
);

alter table public.workflow_api_keys enable row level security;

create policy "Agency members can read workflow api keys"
on public.workflow_api_keys
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "Agency admins can create workflow api keys"
on public.workflow_api_keys
for insert
to authenticated
with check (public.has_agency_role(agency_id, array['owner', 'admin']));

create policy "Agency admins can update workflow api keys"
on public.workflow_api_keys
for update
to authenticated
using (public.has_agency_role(agency_id, array['owner', 'admin']))
with check (public.has_agency_role(agency_id, array['owner', 'admin']));

grant select, insert, update on public.workflow_api_keys to authenticated;
grant select, insert, update on public.workflow_api_keys to service_role;

create index if not exists workflows_active_agency_idx
on public.workflows(agency_id, archived_at, created_at desc);

create index if not exists test_cases_active_pack_idx
on public.test_cases(agency_id, test_pack_id, archived_at, created_at desc);

create index if not exists workflow_api_keys_agency_workflow_idx
on public.workflow_api_keys(agency_id, workflow_id, revoked_at, created_at desc);

create index if not exists clients_report_automation_due_idx
on public.clients(report_automation_enabled, next_report_due_on)
where archived_at is null;

alter table public.audit_events
drop constraint if exists audit_events_action_check;

alter table public.audit_events
add constraint audit_events_action_check check (
  action in (
    'workflow.created',
    'workflow.updated',
    'workflow.archived',
    'check.run',
    'check.disabled',
    'test_pack.updated',
    'test_pack.disabled',
    'test_case.updated',
    'test_case.archived',
    'issue.assigned',
    'issue.resolved',
    'issue.ignored',
    'report.generated',
    'report.pdf_generated',
    'report.send_attempted',
    'billing.webhook_processed'
  )
);

alter table public.audit_events
drop constraint if exists audit_events_target_type_check;

alter table public.audit_events
add constraint audit_events_target_type_check check (
  target_type in ('workflow', 'check', 'test_pack', 'test_case', 'issue', 'report', 'billing_event')
);

alter table public.report_items
drop constraint if exists report_items_category_check;

alter table public.report_items
add constraint report_items_category_check check (
  category in (
    'workflow_health',
    'issues_caught',
    'issues_resolved',
    'qa_checks',
    'model_prompt_changes',
    'recommendation'
  )
);
