# TuesdayOps Architecture

## 1. Overview

TuesdayOps is a multi-tenant SaaS application with background jobs for scheduled monitoring and report generation.

Recommended MVP architecture:

```txt
Browser
  -> Next.js App / API Routes
    -> Supabase Auth
    -> Supabase Postgres
    -> Supabase Storage
    -> Supabase Cron/Vault scheduled triggers
      -> Workflow endpoint checks
      -> Synthetic test pack runs
      -> Issue creation
      -> Report generation
    -> Resend email alerts
    -> Stripe billing
    -> PostHog analytics
    -> Sentry errors
```

## 2. Core services

### Current production-ready MVP implementation slice

- Next.js App Router server components and server actions handle authenticated UI flows.
- Supabase Auth manages identity through SSR cookie clients and route protection.
- Supabase Postgres stores profiles, agencies, memberships, clients, workflows, checks, check runs, issues, test packs, test cases, test runs, reports, and report items.
- Supabase RLS enforces `agency_id` membership boundaries for tenant-owned records.
- Manual endpoint checks run synchronously from server actions and persist redacted summaries.
- Workflow endpoint URLs are validated before storage and again before runner execution to reduce SSRF/private-network risk.
- Workflow check execution does not follow redirects, caps retained response reads, and stores only redacted summaries.
- Failed/degraded manual checks create or update deduped issues keyed by material failure fingerprint.
- Issue queue actions assign, resolve with a report-safe note, or ignore issues inside the tenant boundary.
- Supabase Cron triggers the protected scheduler route every five minutes.
- A scheduled sweep finds enabled due health checks and runs them through the shared scheduled runner.
- Scheduled check runs use a server-only Supabase admin client, persist `trigger = scheduled` and `scheduled_for`, and rely on a unique scheduled window index for idempotency.
- A protected `/api/scheduler/run-due-checks` route exercises the same scheduled runner for QA and operational smoke checks.
- The scheduler trigger route is protected by `SCHEDULER_SECRET` and an in-memory fixed-window limiter to reduce abuse before provider-side firewalling is configured.
- Newly created high/critical issues attempt Resend email alerts with redacted, report-safe copy.
- Synthetic test packs can be created from the Checks page, contain tenant-scoped test cases, run manually through the shared HTTP runner, persist `test_runs`, and create deduped issues linked to `test_run_id` when cases fail.
- Monthly reports aggregate stored workflow, check, issue, and synthetic run data into reproducible report records with report items, private Supabase Storage PDFs, authenticated download, and Resend send attempts.
- Workflow quick import supports direct URLs, cURL commands, OpenAPI JSON, and Postman collection JSON while reusing the normal workflow/check creation path.
- Production readiness checks expose public `/api/health` status without secret disclosure and render provider readiness in Settings.
- Operational reliability checks flag missing enabled checks, stale workflow data, high-risk open issues, and report queue gaps.
- Report quality checks score source data, report sections, recommendations, and open high-risk issues before send/export.
- Stripe billing and plan limits are implemented. Sentry/PostHog are represented in production readiness and still require provider-side configuration before public launch.
- Service-only audit events record key workflow, check, issue, report, and billing lifecycle actions without storing raw auth material.
- Additional database indexes support due-check selection, workflow health summaries, issue queues, report lookups, audit history, and old check-run retention jobs.

### Web app

Responsibilities:

- authentication flows
- dashboard UI
- client/workflow/check/issue/report CRUD
- onboarding wizard
- billing/settings UI

### API layer

Responsibilities:

- validate inputs
- enforce tenant access
- trigger check runs
- create reports
- update issue state
- receive optional workflow run logs

### Background worker

Responsibilities:

- scheduled check runs
- retry handling
- synthetic test pack runs
- issue creation and deduplication
- report generation
- alert dispatch

### Database

Supabase Postgres stores tenant data, workflows, checks, runs, issues, reports, billing state, and audit events.

### Storage

Supabase Storage stores:

- agency logos
- client logos
- generated report PDFs
- optional report assets

## 3. Tenant model

All tenant-owned tables must include `agency_id`.

Users belong to agencies through memberships.

Access pattern:

```txt
user -> membership -> agency -> clients/workflows/checks/issues/reports
```

## 4. Job model

Use Supabase Cron plus the protected Next.js scheduler route for:

- recurring check schedules
- manual check execution
- synthetic test pack execution
- report generation
- alert sending

Jobs must be idempotent where practical.

Supabase Cron calls `/api/scheduler/run-due-checks` every five minutes using `pg_net` with a 45-second timeout. The request URL and scheduler secret are read from Supabase Vault secrets named `tuesdayops_app_url` and `tuesdayops_scheduler_secret`. The database prevents duplicate scheduled runs for the same `(agency_id, check_id, scheduled_for)` window.

## 5. Check execution flow

```txt
Scheduler fires
  -> load enabled checks due for execution
  -> load workflow config
  -> decrypt auth config
  -> send request to workflow endpoint
  -> measure status/latency/response
  -> evaluate assertions
  -> store check_run
  -> calculate run status
  -> create/update issue if needed
  -> send alert if a new high/critical issue was created
  -> update workflow health summary
```

## 6. Synthetic test flow

```txt
User creates test pack
  -> test pack contains test cases
  -> each test has input and assertions
  -> runner sends input to workflow endpoint
  -> evaluates output
  -> stores result
  -> derives test pack pass rate from stored test runs
  -> creates or updates a reportable issue when a test case fails
```

## 7. Report generation flow

```txt
User selects client + month
  -> aggregate check runs
  -> aggregate issues caught/resolved
  -> aggregate workflow health
  -> aggregate test pack results
  -> generate client-safe executive summary and report items
  -> calculate report readiness from source data, sections, recommendations, and open high-risk issues
  -> render report preview from stored report data
  -> generate PDF from stored report data
  -> store PDF in private Supabase Storage
  -> download through tenant-authenticated route
  -> send report link by Resend when configured
```

## 8. Security architecture

- All auth handled by Supabase Auth.
- All tenant-owned rows protected by RLS or service-layer authorization.
- Auth headers and API keys encrypted at rest.
- Raw responses redacted by default.
- Workflow check responses are bounded before summarization to avoid retaining or buffering large payloads.
- Report-safe data allowlisted.
- Audit metadata is recursively redacted before persistence.
- Background jobs run with service role but enforce agency boundaries manually.

## 9. Future architecture considerations

Later versions may add:

- native Langfuse/LangSmith imports
- OpenAI/Anthropic usage ingestion
- browser synthetic checks
- client portal
- white-label domains
- public status pages
- self-hosted/private deployment for larger agencies
