alter table public.reports
add constraint reports_pdf_storage_path_canonical_check
check (
  pdf_storage_path is null
  or pdf_storage_path = agency_id::text || '/' || id::text || '.pdf'
);

revoke insert on public.clients from authenticated;
grant insert on public.clients to service_role;

revoke update on public.agencies from authenticated;
grant update (name, slug, logo_url, primary_color)
on public.agencies
to authenticated;
grant select, insert, update, delete on public.agencies to service_role;

revoke insert on public.workflows from authenticated;
grant insert on public.workflows to service_role;

revoke update on public.workflows from authenticated;
grant update (name, type, environment, method, check_frequency_minutes, status, pass_rate, latency_ms, monthly_cost, last_check_at, included_in_reports, archived_at)
on public.workflows
to authenticated;
grant select, insert, update, delete on public.workflows to service_role;
