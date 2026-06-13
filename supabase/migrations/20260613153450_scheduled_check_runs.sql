alter table public.check_runs
add column trigger text not null default 'manual',
add column scheduled_for timestamptz,
add constraint check_runs_trigger_check check (trigger in ('manual', 'scheduled'));

create unique index check_runs_scheduled_window_unique_idx
on public.check_runs(agency_id, check_id, scheduled_for)
where trigger = 'scheduled' and scheduled_for is not null;

create index check_runs_agency_id_trigger_created_at_idx
on public.check_runs(agency_id, trigger, created_at desc);

grant usage on schema public to service_role;

grant select, insert, update, delete on
  public.clients,
  public.workflows,
  public.checks,
  public.check_runs,
  public.issues
to service_role;
