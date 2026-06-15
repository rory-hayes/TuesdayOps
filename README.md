# TuesdayOps

TuesdayOps is a white-label AI workflow maintenance platform for agencies.

It helps AI and automation agencies monitor client AI workflows after launch, run lightweight QA checks, detect failures, manage maintenance issues, and generate monthly client-ready proof-of-work reports.

## Product promise

> Connect your client AI workflows. TuesdayOps monitors them, flags issues, runs QA checks, and generates monthly reports that prove what was maintained, fixed, and improved.

## MVP scope

The MVP is intentionally narrow. It should validate whether agencies managing live AI workflows will pay for post-launch monitoring and proof reporting.

### Included in MVP

- Agency workspace
- User authentication
- Client management
- Workflow registry
- Endpoint health checks
- Scheduled check runs
- Synthetic test packs
- Issue creation and resolution
- Email and/or Slack alerts
- Monthly white-label report preview
- PDF report export
- Simple billing gate

### Excluded from MVP

- Full AI observability platform
- Deep trace explorer
- LangSmith/Langfuse clone
- Prompt registry
- Model gateway
- Full eval studio
- Agency CRM
- Invoicing/time tracking
- Full client portal
- Marketplace
- Dozens of native integrations

## Core object model

```txt
Agency
  -> User
  -> Client
    -> Workflow
      -> Check
        -> Check Run
          -> Issue
            -> Resolution
              -> Monthly Report
```

## Primary users

- AI agency founder
- AI automation agency operator
- Head of delivery
- Technical implementation lead
- Client success/account manager

## Initial customer profile

AI and automation agencies with:

- 3+ retained clients
- 5+ live client workflows
- recurring maintenance/support work
- a need to prove monthly value to clients

## Build principle

Build the smallest useful product that proves this loop:

1. Add a client.
2. Add a workflow.
3. Connect a check endpoint.
4. Run checks on a schedule.
5. Create issues from failed checks.
6. Resolve issues.
7. Generate a monthly report.

If a feature does not support this loop, it should not be part of the MVP.

## Local development

Install dependencies:

```bash
npm install
```

Use Node.js 20.19 or newer. Node 22+ is recommended for production and Vercel.

Create `.env.local` from `.env.example` or `ENV_EXAMPLE.md`.

Required for the authenticated MVP paths:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
WORKFLOW_AUTH_ENCRYPTION_KEY=
ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=
SCHEDULER_SECRET=
SUPABASE_CRON_ENABLED=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.25
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY` and `SCHEDULER_SECRET` are server-only values. They must never be exposed to browser code or committed to the repo.
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required for live email alerts.
`SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` should both be set to the project DSN so server and browser errors are captured. `SENTRY_EXAMPLE_ENABLED=true` can temporarily expose `/sentry-example-page` in production for verification, but leave it unset for normal operation.
`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are reserved for a later analytics pass and are not launch-blocking while PostHog is intentionally skipped.
`ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true` is only for local/private test environments. Production should leave it unset so workflow checks cannot call localhost, private networks, or metadata endpoints.

Scheduled checks are triggered by Supabase Cron calling `/api/scheduler/run-due-checks`. The Cron SQL reads `tuesdayops_app_url` and `tuesdayops_scheduler_secret` from Supabase Vault, so the scheduler secret is not stored in migrations or client code. Set `SUPABASE_CRON_ENABLED=true` only after the Cron job and Vault secrets are configured.

Local Supabase uses the repo `supabase/config.toml` port range `55420-55429` to avoid clashes with other local Supabase projects.

Run the app:

```bash
npm run dev
```

Verify the app:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run e2e
npm run smoke:production
```

`npm run smoke:production` checks `https://tuesday-ops.vercel.app` by default. Set `PRODUCTION_SMOKE_URL=https://your-deployment.example.com` to target another deployed URL.

Build for production:

```bash
npm run build
```

For production deployment, see `DEPLOYMENT.md`.

## Current implementation state

The repository now contains the foundation, Milestones 1-3, Milestone 4 scheduled checks/issues/alerts, Milestone 5 synthetic test packs, Milestone 6 monthly reports, Milestone 7A launch-readiness hardening, Milestone 7B onboarding, Milestone 7C billing/plan limits, and Milestone 8 QA hardening:

- Next.js App Router app
- TypeScript and Tailwind CSS
- TuesdayOps app shell
- Supabase SSR auth clients and protected app routes
- agency onboarding through a tenant-safe Supabase RPC
- Supabase migration for profiles, agencies, memberships, clients, workflows, checks, check runs, and issues
- tenant-scoped overview, clients, workflows, checks, issues, reports, and settings screens
- client create/update/archive server actions
- registry-first Workflows page with guided Add workflow onboarding for quick import and manual endpoint setup
- workflow creation with encrypted auth config handling
- endpoint health check creation, manual run execution, assertion evaluation, and check run persistence
- failed/degraded manual checks create deduped issues with severity mapping
- issue queue filters, expandable details, assignment, resolution notes, and ignore actions
- Supabase Cron/Vault scheduled trigger for `/api/scheduler/run-due-checks`
- protected scheduler trigger at `/api/scheduler/run-due-checks`
- scheduled check runs persist `trigger` and `scheduled_for` metadata with idempotent duplicate-window protection
- bounded workflow check response reads, blocked redirect following, and fixed-window protection on the scheduler trigger route
- high/critical issue email alert service with Resend delivery and alert-safe redacted copy
- tenant-scoped synthetic test packs, test cases, test runs, and manual pack execution from the Checks page
- failed synthetic test cases create deduped reportable issues linked to `test_run_id`
- tenant-scoped monthly report generation, report items, preview UI, PDF storage/download, and Resend-backed send attempts
- production deployment checklist, Supabase migration checklist, smoke checklist, Node runtime floor, and clean dependency audit
- GitHub Actions CI plus a production smoke workflow that checks public app/Supabase health without requiring provider secrets
- overview activation checklist for first client, workflow, check run, and report
- Stripe Checkout, Customer Portal, webhook route, agency billing state, and plan-limit enforcement
- service-only audit event foundations for workflow, check, issue, report, and billing lifecycle events
- scalability indexes for workflow health, due checks, check history, issue queues, reports, test runs, and audit history
- 95% Vitest coverage gate across MVP services and API routes, including branch coverage
- cross-tenant report download E2E coverage, starter workflow-limit E2E coverage, drill-down/feedback E2E coverage, and Stripe webhook route safety tests
- domain, assertion, billing, issue-engine, scheduler, onboarding, synthetic-runner, API route, and Playwright E2E tests

The core MVP milestone list is now implemented. Live provider behavior still depends on production env vars and provider-side configuration.
