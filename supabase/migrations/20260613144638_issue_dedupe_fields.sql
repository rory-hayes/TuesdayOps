alter table public.issues
add column fingerprint text,
add column last_seen_at timestamptz not null default now(),
add column occurrence_count integer not null default 1;

create unique index issues_active_fingerprint_unique_idx
on public.issues(agency_id, workflow_id, fingerprint)
where fingerprint is not null and status in ('open', 'in_review');

create index issues_agency_id_last_seen_at_idx
on public.issues(agency_id, last_seen_at desc);
