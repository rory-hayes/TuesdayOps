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
    -> Inngest/Trigger.dev Jobs
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

### Current Milestones 1-4 implementation slice

- Next.js App Router server components and server actions handle authenticated UI flows.
- Supabase Auth manages identity through SSR cookie clients and route protection.
- Supabase Postgres stores profiles, agencies, memberships, clients, workflows, checks, check runs, and issues.
- Supabase RLS enforces `agency_id` membership boundaries for tenant-owned records.
- Manual endpoint checks run synchronously from server actions and persist redacted summaries.
- Failed/degraded manual checks create or update deduped issues keyed by material failure fingerprint.
- Issue queue actions assign, resolve with a report-safe note, or ignore issues inside the tenant boundary.
- Scheduled jobs, alerts, report generation, billing, and analytics remain planned later milestones.

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

Use Inngest or Trigger.dev for:

- recurring check schedules
- manual check execution
- synthetic test pack execution
- report generation
- alert sending

Jobs must be idempotent where practical.

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
  -> send alert if severity threshold met
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
  -> updates test pack pass rate
  -> creates issue if failure threshold exceeded
```

## 7. Report generation flow

```txt
User selects client + month
  -> aggregate check runs
  -> aggregate issues caught/resolved
  -> aggregate workflow health
  -> aggregate test pack results
  -> generate executive summary
  -> render report preview
  -> generate PDF
  -> store PDF in Supabase Storage
  -> mark report generated
```

## 8. Security architecture

- All auth handled by Supabase Auth.
- All tenant-owned rows protected by RLS or service-layer authorization.
- Auth headers and API keys encrypted at rest.
- Raw responses redacted by default.
- Report-safe data allowlisted.
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
