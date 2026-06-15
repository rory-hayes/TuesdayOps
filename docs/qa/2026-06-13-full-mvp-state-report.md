# TuesdayOps Full MVP State Report

Date: 2026-06-13

Current main commit:

```txt
0b17fd7 Merge pull request #9 from rory-hayes/codex/milestone-7c-billing-limits
```

Production status:

```txt
Vercel - tuesday-ops: success
Vercel - tuesday-ops-dbrf: success
```

## Executive Summary

TuesdayOps has reached the clickable MVP implementation target for the focused agency workflow-maintenance loop:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report
```

The app now supports authenticated agency workspaces, tenant-scoped clients and workflows, manual and scheduled checks, issue creation/dedupe, high-severity alert attempts, synthetic test packs, monthly reports with PDF export, real-data onboarding, and a basic Stripe billing gate with plan-limit enforcement.

The latest full local gate passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm audit --audit-level=moderate
```

Latest results:

```txt
Unit: 16 files passed, 46 tests passed
E2E: 6 passed
Audit: found 0 vulnerabilities
Build: passed
```

## Milestone Status

| Milestone | State | Notes |
|---|---:|---|
| 0 Repo foundation | Done | Next.js, TypeScript, Tailwind, base shell, docs, scripts |
| 1 Auth and agency workspace | Done | Supabase Auth, onboarding RPC, memberships, RLS |
| 2 Clients and workflows | Done | Client/workflow CRUD, encrypted workflow auth config |
| 3 Endpoint health checks | Done | HTTP runner, assertions, manual run history |
| 4 Scheduled checks and issues | Done | Inngest route, scheduler trigger, issue dedupe, alerts |
| 5 Test packs | Done | Synthetic cases/runs, failure issue creation |
| 6 Reports | Done | Aggregation, preview, PDF storage/download, send attempts |
| 7A Launch readiness | Done | Deployment docs, Node floor, clean audit |
| 7B Onboarding | Done | Activation checklist based on real tenant data |
| 7C Billing/limits | Done | Stripe Checkout/Portal/webhook and plan limits |

Recent PRs:

```txt
#7 chore: add launch readiness hardening
#8 feat: add onboarding demo mode
#9 feat: add billing and plan limits
```

## Verification Evidence

### Static and Unit

Passed:

```bash
npm run lint
npm run typecheck
npm run test
```

Unit result:

```txt
16 passed
46 passed
```

Covered unit areas include:

- slug generation
- endpoint assertion evaluation
- check execution status behavior
- scheduled runner helpers
- issue severity/dedupe helpers
- alert delivery policy/copy
- synthetic test-pack runner
- report aggregation/PDF helpers
- onboarding progress calculation
- sample data seed shape
- billing plan-limit decisions
- Stripe webhook subscription mapping

### Build

Passed:

```bash
npm run build
```

Build includes:

```txt
/api/inngest
/api/reports/[reportId]/download
/api/scheduler/run-due-checks
/api/stripe/webhook
```

### E2E

Passed:

```bash
npm run e2e
```

Result:

```txt
6 passed
```

Covered flows:

- onboarding without demo seeding
- billing settings and starter client limit
- scheduled checks
- high-severity alert attempt
- synthetic test pack run
- report generation, PDF download, and send/fail-safe behavior

### Supabase

Applied migrations through:

```txt
20260613174842_billing_and_plan_limits.sql
```

Latest successful checks:

```bash
supabase migration list --linked
supabase db lint --linked --fail-on error
supabase db push --dry-run --linked
```

Results:

```txt
Migration list includes 20260613174842 locally and remotely
No schema errors found
Remote database is up to date
```

Operational note: run Supabase CLI migration/lint commands sequentially. Parallel CLI calls can exhaust temporary login attempts; earlier retries also showed IPv6 connection issues until the project was relinked.

## Current Product State

### Auth and Tenant Boundary

- Supabase Auth protects app routes.
- Users without a workspace redirect to onboarding.
- Agencies, memberships, and tenant-owned rows use `agency_id`.
- RLS is enabled on tenant-owned public tables.
- Tenant-matched composite foreign keys prevent cross-agency child references where practical.

QA should continue to probe cross-tenant URLs and report downloads.

### Clients and Workflows

- Users can create, edit, and archive clients.
- Users can create workflows with endpoint URL, method, environment, auth type, frequency, expected status, and latency target.
- Workflow auth secrets are encrypted before persistence.
- Starter plan creation is limited to:

```txt
clients: 1
workflows: 3
```

- Existing rows above a limit are preserved; only new create actions are blocked.

### Checks and Scheduled Runs

- Manual check runs persist status, status code, latency, assertion results, and safe summaries.
- Scheduled check trigger is available at:

```txt
POST /api/scheduler/run-due-checks
```

- Scheduler route requires `SCHEDULER_SECRET`.
- Scheduled runs use a unique scheduled-window index to avoid duplicate runs for the same check/window.

### Issues and Alerts

- Failed/degraded checks create or update reportable issues.
- Active issue fingerprints dedupe repeated failures.
- Users can assign, ignore, and resolve issues with notes.
- High/critical newly created issues attempt Resend email alerts.
- Alert emails use redacted, report-safe fields.
- Missing Resend config records an error without breaking check execution.

### Test Packs

- Users can create test packs and test cases from Checks.
- Manual pack runs execute against workflow endpoints.
- Results persist in `test_runs`.
- Failed synthetic runs create or update reportable issues.

Current limitation: synthetic packs are manual only; scheduled synthetic pack runs are not implemented.

### Reports

- Users can generate monthly reports by client and month.
- Reports aggregate workflows, check runs, issues, resolutions, and synthetic test results.
- Report preview is client-safe.
- PDF generation stores files in private Supabase Storage under the `reports` bucket.
- Downloads require authenticated agency access.
- Send action uses Resend when configured and records `send_error` when not configured.

Current limitation: report emails use a download link, not a direct PDF attachment.

### Onboarding

- Overview includes a five-step activation checklist:
  - create agency
  - add first client
  - add first workflow
  - run first check
  - create first report
- Update on 2026-06-15: the demo seed action was removed from the active MVP.
- Activation now uses real tenant client, workflow, check-run, and report data only.

### Billing

- Settings shows billing status, trial end, client usage, and workflow usage.
- Checkout action creates/reuses a Stripe customer and redirects to Stripe Checkout.
- Customer Portal action redirects to Stripe Portal when the agency has a customer ID.
- Webhook route:

```txt
POST /api/stripe/webhook
```

- Webhook verifies raw body signatures with `STRIPE_WEBHOOK_SECRET`.
- Processed event IDs are stored in `billing_events`.
- Subscription events update agency billing fields.
- Installed Stripe SDK latest typed API version: `2026-05-27.dahlia`.

Current limitation: live Stripe payment collection is not verified until production Stripe env vars and Dashboard webhook/portal configuration are added.

## Known Residual Risks

- Live Resend delivery depends on `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- Inngest cloud scheduling depends on the Vercel integration or production Inngest keys.
- Stripe live checkout depends on `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, Dashboard Customer Portal config, and webhook setup.
- PostHog and Sentry variables are reserved but product analytics/error tracking are not implemented.
- Demo data is synthetic and user-triggered; it should not be confused with real client data.
- Report PDFs are functional but visually minimal.
- There is no public client portal or public report URL.
- Synthetic test packs do not auto-resolve previous synthetic issues after a later pass.

## QA Recommendations

Before design-partner use, QA should run:

1. Fresh account signup/sign-in and onboarding.
2. Cross-tenant access checks for workflow detail URLs and report download URLs.
3. First client/workflow/check/report happy path.
4. Failed check to issue creation and repeated-failure dedupe.
5. Issue resolve/ignore flows.
6. Synthetic test-pack failure to issue creation.
7. Report PDF generation and authenticated download.
8. Missing Resend and missing Stripe config safe-failure paths.
9. Live provider smoke tests after production env vars are configured:
   - Inngest scheduled sweep
   - Resend email delivery
   - Stripe Checkout
   - Stripe Customer Portal
   - Stripe webhook subscription update

## Next Recommended Milestones

1. Production provider wiring:
   - Inngest integration
   - Resend verified sender
   - Stripe test-mode product/price, portal config, webhook endpoint
   - Sentry and PostHog

2. QA hardening:
   - dedicated tenant-isolation E2E for report downloads
   - webhook signature tests
   - plan-limit workflow E2E
   - report metric reconciliation checklist

3. Design-partner polish:
   - branded report PDF layout
   - report scheduling
   - Slack alert option
   - workflow templates for n8n, Make, Zapier, Supabase Edge Functions, and MCP servers
