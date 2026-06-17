create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limit_buckets_request_count_check check (request_count >= 0)
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  limit_count integer,
  remaining integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_bucket public.rate_limit_buckets%rowtype;
  v_new_count integer;
begin
  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'Rate limit bucket key is required.';
  end if;

  if p_limit < 1 then
    raise exception 'Rate limit must be greater than zero.';
  end if;

  if p_window_seconds < 1 then
    raise exception 'Rate limit window must be greater than zero.';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into public.rate_limit_buckets(bucket_key, request_count, window_started_at, updated_at)
  values (p_bucket_key, 0, v_now, v_now)
  on conflict (bucket_key) do nothing;

  select *
  into v_bucket
  from public.rate_limit_buckets
  where bucket_key = p_bucket_key
  for update;

  if v_bucket.window_started_at <= v_now - v_window then
    update public.rate_limit_buckets
    set request_count = 1,
      window_started_at = v_now,
      updated_at = v_now
    where bucket_key = p_bucket_key
    returning * into v_bucket;

    return query select
      true,
      p_limit,
      greatest(p_limit - 1, 0),
      p_window_seconds,
      v_now + v_window;
    return;
  end if;

  if v_bucket.request_count < p_limit then
    v_new_count := v_bucket.request_count + 1;

    update public.rate_limit_buckets
    set request_count = v_new_count,
      updated_at = v_now
    where bucket_key = p_bucket_key
    returning * into v_bucket;

    return query select
      true,
      p_limit,
      greatest(p_limit - v_new_count, 0),
      greatest(ceil(extract(epoch from ((v_bucket.window_started_at + v_window) - v_now)))::integer, 0),
      v_bucket.window_started_at + v_window;
    return;
  end if;

  return query select
    false,
    p_limit,
    0,
    greatest(ceil(extract(epoch from ((v_bucket.window_started_at + v_window) - v_now)))::integer, 0),
    v_bucket.window_started_at + v_window;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
