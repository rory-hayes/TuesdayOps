alter table public.issues
add column if not exists snoozed_until timestamptz;

alter table public.issues
drop constraint if exists issues_status_check;

alter table public.issues
add constraint issues_status_check check (status in ('open', 'in_review', 'resolved', 'ignored', 'snoozed'));

drop index if exists issues_active_fingerprint_unique_idx;

create unique index issues_active_fingerprint_unique_idx
on public.issues(agency_id, workflow_id, fingerprint)
where fingerprint is not null and status in ('open', 'in_review', 'snoozed');

create index if not exists issues_agency_snoozed_until_idx
on public.issues(agency_id, snoozed_until)
where status = 'snoozed';

alter table public.audit_events
drop constraint if exists audit_events_action_check;

alter table public.audit_events
add constraint audit_events_action_check check (
  action in (
    'workflow.created',
    'workflow.updated',
    'workflow.archived',
    'check.updated',
    'check.disabled',
    'check.run',
    'test_pack.updated',
    'test_pack.disabled',
    'test_case.updated',
    'test_case.archived',
    'issue.assigned',
    'issue.resolved',
    'issue.ignored',
    'issue.snoozed',
    'report.generated',
    'report.pdf_generated',
    'report.send_attempted',
    'billing.webhook_processed'
  )
);

create or replace function public.get_due_health_checks(
  p_now timestamptz,
  p_limit integer default 50,
  p_check_id uuid default null
)
returns table (
  id uuid,
  agency_id uuid,
  enabled boolean,
  workflow_id uuid,
  endpoint_url text,
  check_frequency_minutes integer,
  latest_completed_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select
    checks.id,
    checks.agency_id,
    checks.enabled,
    checks.workflow_id,
    workflows.endpoint_url,
    workflows.check_frequency_minutes,
    latest_runs.completed_at as latest_completed_at
  from public.checks
  join public.workflows
    on workflows.id = checks.workflow_id
   and workflows.agency_id = checks.agency_id
  left join lateral (
    select check_runs.completed_at
    from public.check_runs
    where check_runs.agency_id = checks.agency_id
      and check_runs.check_id = checks.id
      and check_runs.completed_at is not null
    order by check_runs.completed_at desc
    limit 1
  ) latest_runs on true
  where checks.type = 'health'
    and checks.enabled = true
    and workflows.archived_at is null
    and (p_check_id is null or checks.id = p_check_id)
    and (
      latest_runs.completed_at is null
      or latest_runs.completed_at <= p_now - make_interval(mins => greatest(workflows.check_frequency_minutes, 5))
    )
  order by coalesce(latest_runs.completed_at, 'epoch'::timestamptz) asc, checks.created_at asc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_due_health_checks(timestamptz, integer, uuid) from public;
revoke all on function public.get_due_health_checks(timestamptz, integer, uuid) from anon;
revoke all on function public.get_due_health_checks(timestamptz, integer, uuid) from authenticated;
grant execute on function public.get_due_health_checks(timestamptz, integer, uuid) to service_role;
