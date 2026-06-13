alter table public.issues
add column alert_sent_at timestamptz,
add column alert_delivery_id text,
add column alert_error text,
add column alert_last_attempt_at timestamptz;

create index issues_agency_id_alert_sent_at_idx
on public.issues(agency_id, alert_sent_at desc)
where alert_sent_at is not null;
