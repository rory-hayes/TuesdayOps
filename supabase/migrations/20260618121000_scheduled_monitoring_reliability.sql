drop function if exists public.get_due_health_checks(timestamptz, integer, uuid);

create or replace function public.get_due_health_checks(
  p_now timestamptz,
  p_limit integer default 50,
  p_check_id uuid default null,
  p_exclude_check_ids uuid[] default '{}'::uuid[]
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
    and not (checks.id = any(coalesce(p_exclude_check_ids, '{}'::uuid[])))
    and (
      latest_runs.completed_at is null
      or latest_runs.completed_at <= p_now - make_interval(mins => greatest(workflows.check_frequency_minutes, 5))
    )
  order by coalesce(latest_runs.completed_at, 'epoch'::timestamptz) asc, checks.created_at asc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_due_health_checks(timestamptz, integer, uuid, uuid[]) from public;
revoke all on function public.get_due_health_checks(timestamptz, integer, uuid, uuid[]) from anon;
revoke all on function public.get_due_health_checks(timestamptz, integer, uuid, uuid[]) from authenticated;
grant execute on function public.get_due_health_checks(timestamptz, integer, uuid, uuid[]) to service_role;
