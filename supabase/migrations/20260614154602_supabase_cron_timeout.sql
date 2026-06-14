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
    timeout_milliseconds := 45000
  )
    into request_id;

  return request_id;
end;
$$;

revoke execute on function public.trigger_due_check_sweep() from public, anon, authenticated;
grant execute on function public.trigger_due_check_sweep() to service_role;
