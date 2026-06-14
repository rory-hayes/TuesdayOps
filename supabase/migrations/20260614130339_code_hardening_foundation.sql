create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_action_check check (
    action in (
      'workflow.created',
      'workflow.updated',
      'check.run',
      'issue.assigned',
      'issue.resolved',
      'issue.ignored',
      'report.generated',
      'report.pdf_generated',
      'report.send_attempted',
      'billing.webhook_processed'
    )
  ),
  constraint audit_events_target_type_check check (
    target_type in ('workflow', 'check', 'issue', 'report', 'billing_event')
  )
);

alter table public.audit_events enable row level security;

create policy "Agency members can read audit events"
on public.audit_events
for select
to authenticated
using (public.is_agency_member(agency_id));

create index audit_events_agency_created_at_idx
on public.audit_events(agency_id, created_at desc);

create index audit_events_agency_target_idx
on public.audit_events(agency_id, target_type, target_id, created_at desc);

grant select on public.audit_events to authenticated;
grant select, insert on public.audit_events to service_role;

create index workflows_agency_client_status_idx
on public.workflows(agency_id, client_id, status);

create index workflows_agency_last_check_idx
on public.workflows(agency_id, last_check_at desc);

create index checks_enabled_health_idx
on public.checks(agency_id, workflow_id, created_at desc)
where enabled = true and type = 'health';

create index check_runs_agency_workflow_completed_idx
on public.check_runs(agency_id, workflow_id, completed_at desc);

create index check_runs_agency_check_completed_idx
on public.check_runs(agency_id, check_id, completed_at desc);

create index issues_agency_status_severity_updated_idx
on public.issues(agency_id, status, severity, updated_at desc);

create index issues_agency_reportable_resolved_idx
on public.issues(agency_id, reportable, resolved_at desc)
where reportable = true;

create index reports_agency_status_created_idx
on public.reports(agency_id, status, created_at desc);

create index test_runs_agency_workflow_created_idx
on public.test_runs(agency_id, workflow_id, created_at desc);

create or replace function public.delete_old_check_runs(
  older_than interval default interval '180 days',
  max_delete integer default 5000
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.check_runs
  where id in (
    select id
    from public.check_runs
    where created_at < now() - older_than
    order by created_at asc
    limit greatest(max_delete, 0)
  );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_old_check_runs(interval, integer) from public;
grant execute on function public.delete_old_check_runs(interval, integer) to service_role;
