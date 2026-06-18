update public.issues
set check_run_id = null
where check_run_id is not null
  and not exists (
    select 1
    from public.check_runs
    where check_runs.id = issues.check_run_id
      and check_runs.agency_id = issues.agency_id
  );

alter table public.issues
drop constraint if exists issues_check_run_id_fkey;

alter table public.issues
add constraint issues_check_run_agency_fk
foreign key (check_run_id, agency_id)
references public.check_runs(id, agency_id)
on delete set null (check_run_id);
