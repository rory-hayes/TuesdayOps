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
    -> Sentry errors
```

## 2. Core services

### Current production-ready MVP implementation slice

- Next.js App Router server components and server actions handle authenticated UI flows.
- Supabase Auth manages identity through SSR cookie clients and route protection.
- Supabase Postgres stores profiles, agencies, memberships, clients, workflows, checks, check runs, issues, test packs, test cases, test runs, reports, and report items.
- Supabase RLS enforces `agency_id` membership boundaries for tenant-owned records.
- The logged-out root route renders a public landing page; authenticated users still land in the tenant dashboard.
- Workflow, check, test pack, and test case lifecycle actions provide archive/disable/edit controls without hard-deleting operational history.
- Manual endpoint checks run synchronously from server actions and persist redacted summaries.
- External systems can post run metadata to `/api/public/run-log` with workflow-scoped hashed API keys. The route stores normal `check_runs`, updates workflow health, and creates or updates issues for degraded/failed logs.
- Workflow endpoint URLs are validated before storage and again before runner execution to reduce SSRF/private-network risk.
- Workflow check execution does not follow redirects, caps retained response reads, and stores only redacted summaries.
- Failed/degraded manual checks create or update deduped issues keyed by material failure fingerprint.
- Issue queue actions assign, resolve with a report-safe note, or ignore issues inside the tenant boundary.
- Supabase Cron triggers the protected scheduler route every five minutes.
- A scheduled sweep finds enabled due health checks and runs them through the shared scheduled runner.
- Scheduled check runs use a server-only Supabase admin client, persist `trigger = scheduled` and `scheduled_for`, and rely on a unique scheduled window index for idempotency.
- A protected `/api/scheduler/run-due-checks` route exercises the same scheduled runner for QA and operational smoke checks.
- The scheduler trigger routes are protected by `SCHEDULER_SECRET`, cheap in-memory throttling for unauthorized due-check attempts, and DB-backed service-role rate limits for authorized scheduler calls.
- Newly created high/critical issues attempt Resend email alerts with redacted, report-safe copy.
- Synthetic test packs can be created from the Checks page, contain tenant-scoped test cases, support required JSON/text/regex/field assertions, run manually through the shared HTTP runner, persist `test_runs`, and create deduped issues linked to `test_run_id` when cases fail.
- Monthly reports aggregate stored workflow, check, issue, synthetic run, and model/prompt comparison data into reproducible report records with report items, private Supabase Storage PDFs, authenticated download, and Resend send attempts that attach the generated PDF.
- Monthly report draft automation can generate prior-month report drafts for clients that opt in. It does not send email automatically.
- Overview, client, and workflow pages render lightweight SVG trend charts from stored pass-rate, run-volume, and severity data.
- The Workflows page is registry-first; the Add workflow dialog contains quick import and manual setup so agencies can find existing workflows before starting a new onboarding path.
- Workflow quick import supports direct URLs, cURL commands, OpenAPI JSON/YAML/text/URL, and Postman collection JSON while reusing the normal workflow/check creation path.
- Production readiness checks expose public `/api/health` status without secret disclosure. Provider launch gates are kept out of the user-facing Settings UI.
- Operational reliability checks flag missing enabled checks, stale workflow data, high-risk open issues, and report queue gaps.
- Report quality checks score source data, report sections, recommendations, and open high-risk issues before send/export.
- Stripe billing and plan limits are implemented. Sentry SDK error capture is configured and launch-blocking in production readiness; PostHog analytics envs are reserved but optional while the analytics pass is intentionally skipped.
- Service-only audit events record key workflow, check, issue, report, and billing lifecycle actions without storing raw auth material.
- Additional database indexes support due-check selection, workflow health summaries, issue queues, report lookups, audit history, and old check-run retention jobs.

### Web app

Responsibilities:

- authentication flows
- dashboard UI
- client/workflow/check/issue/report CRUD
- onboarding wizard
- billing/settings UI
- logged-out public landing page

### API layer

Responsibilities:

- validate inputs
- enforce tenant access
- trigger check runs
- create reports
- update issue state
- receive workflow run logs through scoped public API keys

### Background worker

Responsibilities:

- scheduled check runs
- retry handling
- synthetic test pack runs
- issue creation and deduplication
- report generation and monthly draft automation
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

Monthly report automation calls `/api/scheduler/run-monthly-reports` with the same scheduler secret. It finds opted-in active clients whose `next_report_due_on` is due, builds a reproducible prior-month draft from stored source data, advances `next_report_due_on`, and leaves sending/export under user control.

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

## 6. External run-log flow

```txt
External workflow posts run metadata
  -> validate bearer API key hash
  -> confirm key belongs to workflow
  -> create or reuse "External run log" health check
  -> store check_run with status, latency, model, prompt version, and cost
  -> update workflow summary
  -> create/update issue when degraded or failed
```

Plaintext run-log keys are only shown once when rotated. Stored key material is hashed; the UI shows prefixes for active keys.

## 7. Synthetic test flow

```txt
User creates test pack
  -> test pack contains test cases
  -> each test has input and assertions
  -> runner sends input to workflow endpoint
  -> evaluates output
  -> evaluates status, latency, JSON, field, text, and regex assertions
  -> stores result
  -> derives test pack pass rate from stored test runs
  -> creates or updates a reportable issue when a test case fails
```

## 8. Report generation flow

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
  -> send report email by Resend when configured, including the PDF attachment and app download link
```

## 9. Security architecture

- All auth handled by Supabase Auth.
- All tenant-owned rows protected by RLS or service-layer authorization.
- Auth headers are encrypted at rest. Run-log API keys are generated once, shown once, and stored only as hashes plus non-secret prefixes.
- Raw responses redacted by default.
- Workflow check responses are bounded before summarization to avoid retaining or buffering large payloads.
- Sensitive actions and exposed routes use DB-backed rate limits with hashed identifiers rather than raw API keys or emails.
- Report-safe data allowlisted.
- Audit metadata is recursively redacted before persistence.
- Background jobs run with service role but enforce agency boundaries manually.

## 10. Deferred architecture considerations

The current design-partner plan intentionally skips Slack alerts, PostHog analytics, brand-logo work, client portal, and browser synthetic checks. Later versions may revisit:

- native Langfuse/LangSmith imports
- OpenAI/Anthropic usage ingestion
- white-label domains
- public status pages
- self-hosted/private deployment for larger agencies
