create extension if not exists pg_net;
create extension if not exists pg_cron;

create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

create or replace function public.trigger_due_check_sweep()
returns bigint
language plpgsql
set search_path = public
as $$
declare
  app_url text;
  scheduler_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into app_url
    from vault.decrypted_secrets
   where name = 'tuesdayops_app_url'
   limit 1;

  select decrypted_secret
    into scheduler_secret
    from vault.decrypted_secrets
   where name = 'tuesdayops_scheduler_secret'
   limit 1;

  if app_url is null or btrim(app_url) = '' then
    raise exception 'Missing Supabase Vault secret: tuesdayops_app_url';
  end if;

  if scheduler_secret is null or btrim(scheduler_secret) = '' then
    raise exception 'Missing Supabase Vault secret: tuesdayops_scheduler_secret';
  end if;

  select net.http_post(
    url := rtrim(app_url, '/') || '/api/scheduler/run-due-checks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || scheduler_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  )
    into request_id;

  return request_id;
end;
$$;

create or replace function public.configure_due_check_cron(
  schedule_expression text default '*/5 * * * *'
)
returns text
language plpgsql
set search_path = public
as $$
declare
  job_name constant text := 'tuesdayops-run-due-checks';
  job_exists boolean := false;
  job_id bigint;
begin
  if to_regclass('cron.job') is null then
    return 'Supabase Cron is not enabled. Enable pg_cron, then run select public.configure_due_check_cron();';
  end if;

  execute 'select exists (select 1 from cron.job where jobname = $1)'
    using job_name
    into job_exists;

  if job_exists then
    execute 'select cron.unschedule($1)'
      using job_name;
  end if;

  execute 'select cron.schedule($1, $2, $3)'
    using job_name, schedule_expression, 'select public.trigger_due_check_sweep();'
    into job_id;

  return format('scheduled %s as job %s on %s', job_name, job_id, schedule_expression);
end;
$$;

revoke execute on function public.trigger_due_check_sweep() from public, anon, authenticated;
revoke execute on function public.configure_due_check_cron(text) from public, anon, authenticated;

grant execute on function public.trigger_due_check_sweep() to service_role;
grant execute on function public.configure_due_check_cron(text) to service_role;

do $$
begin
  if to_regclass('cron.job') is not null then
    raise notice '%', public.configure_due_check_cron();
  else
    raise notice 'Supabase Cron is not enabled yet. Enable pg_cron, then run select public.configure_due_check_cron();';
  end if;
end;
$$;
