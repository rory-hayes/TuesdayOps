# Milestone 6 Reports QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-6-reports`

## Scope

This handoff covers Milestone 6 Reports:

- Reports schema.
- Report item modules.
- Report aggregation service.
- Report preview UI.
- PDF generation and private storage.
- Authenticated PDF download.
- Resend report send attempts.

The product loop under test is:

```txt
Check Run + Issue + Test Run -> Monthly Report -> PDF -> Send
```

## Implementation Summary

- Added `reports` and `report_items` tables.
- Added a private Supabase Storage bucket named `reports`.
- Added report generation from stored operational data:
  - monitored workflows
  - check runs
  - reportable issues caught
  - reportable issues resolved
  - synthetic test runs
- Added report-safe aggregation rules that avoid raw response summaries and secret-like material.
- Added server-side PDF rendering and storage under `agency_id/report_id.pdf`.
- Added authenticated download route:

```txt
GET /api/reports/:reportId/download
```

- Added Resend-backed report send action that emails the authenticated download link.
- Missing Resend configuration is recorded on `reports.send_error` and does not break report generation or PDF export.

## Database Changes

Migration applied to the linked remote Supabase project:

```txt
20260613165022_reports.sql
```

New tables:

```txt
reports
report_items
```

New storage bucket:

```txt
reports
```

Security notes:

- RLS is enabled on `reports` and `report_items`.
- Authenticated users can only manage rows where `public.is_agency_member(agency_id)` is true.
- Report rows reference clients through `(client_id, agency_id)`.
- Report items reference reports through `(report_id, agency_id)`.
- PDF files are stored in a private bucket and served only through an authenticated route.

## Verification Evidence

### Focused Checks Already Passed

```bash
npm run typecheck
npm run test
npm run e2e -- e2e/reports.spec.ts
```

Focused E2E result:

```txt
1 passed
```

Covered flow:

- confirmed QA user sign-in
- onboarding
- client creation
- workflow creation
- manual failed check run
- issue creation
- monthly report generation
- report preview
- PDF generation
- authenticated PDF download
- Resend send status handling

### Full Milestone Gate

Passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
supabase migration list --linked
supabase db lint --linked --fail-on error
supabase db push --dry-run --linked
npm audit --audit-level=moderate
```

Full E2E result:

```txt
4 passed
```

Supabase DB lint result:

```txt
No schema errors found
```

Final migration dry run result:

```txt
Remote database is up to date.
```

`npm audit --audit-level=moderate` still reports the known upstream `postcss` and `esbuild` advisories. The suggested `npm audit fix --force` path would install breaking/downgrade versions, so no force fix was applied.

## Known Residual Risks

- Report PDFs use a minimal server-side PDF renderer, not a fully branded multi-page layout engine.
- Report send uses a download link rather than attaching the PDF.
- Live Resend delivery still depends on `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- Report recommendations are rule-based and intentionally conservative.
- There is no client portal or public report URL; downloads require authenticated agency access.

## QA Recommendation

QA should verify:

- Report generation works for a client with check runs and issues.
- Report metrics match the source data for the selected month.
- Report preview excludes raw response bodies and secrets.
- PDF download returns `application/pdf` and starts with `%PDF`.
- Sending without Resend config records `send_error`.
- Another agency cannot access the report download route.
