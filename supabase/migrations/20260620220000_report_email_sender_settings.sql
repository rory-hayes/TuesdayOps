alter table public.agencies
add column if not exists report_sender_name text not null default 'MaintainFlow Reports',
add column if not exists report_sender_email text not null default 'reports@maintainflow.io',
add column if not exists report_reply_to_email text,
add column if not exists report_sender_domain text not null default 'maintainflow.io',
add column if not exists report_sender_domain_status text not null default 'verified';

alter table public.agencies
alter column report_sender_domain_status set default 'verified';

alter table public.agencies
drop constraint if exists agencies_report_sender_domain_status_check;

alter table public.agencies
add constraint agencies_report_sender_domain_status_check
check (report_sender_domain_status in ('pending', 'verified', 'failed'));

alter table public.agencies
drop constraint if exists agencies_report_sender_email_format_check;

alter table public.agencies
add constraint agencies_report_sender_email_format_check
check (report_sender_email ~* '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$');

alter table public.agencies
drop constraint if exists agencies_report_reply_to_email_format_check;

alter table public.agencies
add constraint agencies_report_reply_to_email_format_check
check (
  report_reply_to_email is null
  or report_reply_to_email ~* '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
);

update public.agencies
set report_sender_domain_status = 'verified'
where report_sender_domain = 'maintainflow.io'
  and report_sender_email ilike '%@maintainflow.io'
  and report_sender_domain_status = 'pending';

grant update (
  name,
  slug,
  logo_url,
  primary_color
)
on public.agencies
to authenticated;
