create table public.reports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null,
  period_start date not null,
  period_end date not null,
  period text not null,
  period_label text not null,
  status text not null default 'draft',
  summary text not null default '',
  metrics_json jsonb not null default '{}'::jsonb,
  recommendations_json jsonb not null default '[]'::jsonb,
  pdf_url text,
  pdf_storage_path text,
  email_delivery_id text,
  send_error text,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  unique (agency_id, client_id, period_start, period_end),
  constraint reports_client_agency_fk foreign key (client_id, agency_id)
    references public.clients(id, agency_id) on delete cascade,
  constraint reports_status_check check (status in ('draft', 'ready_to_send', 'sent', 'failed')),
  constraint reports_period_order_check check (period_end >= period_start)
);

create table public.report_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  report_id uuid not null,
  category text not null,
  title text not null,
  body text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  constraint report_items_report_agency_fk foreign key (report_id, agency_id)
    references public.reports(id, agency_id) on delete cascade,
  constraint report_items_category_check check (
    category in ('workflow_health', 'issues_caught', 'issues_resolved', 'qa_checks', 'recommendation')
  )
);

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do update
set public = false;

create index reports_agency_id_created_at_idx on public.reports(agency_id, created_at desc);
create index reports_client_period_idx on public.reports(client_id, period_start desc);
create index report_items_agency_id_report_id_idx on public.report_items(agency_id, report_id);

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
alter table public.report_items enable row level security;

create policy "Agency members can manage reports"
on public.reports
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "Agency members can manage report items"
on public.report_items
for all
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

grant select, insert, update, delete on
  public.reports,
  public.report_items
to authenticated, service_role;
