# TuesdayOps MVP Tasks

Use this as the working ticket list for Codex.

Status values:

- `[ ]` not started
- `[~]` in progress
- `[x]` done
- `[!]` blocked

## Milestone 0 — Repo Foundation

### T0.1 Create Next.js project

- [x] Initialize Next.js app with TypeScript.
- [x] Add Tailwind CSS.
- [x] Add shadcn/ui-compatible primitives.
- [x] Add base layout.
- [x] Add lint/typecheck/test scripts.

Acceptance:

- app runs locally
- lint/typecheck pass
- basic landing route renders

### T0.2 Add project documentation

- [x] Add all docs from Codex pack.
- [x] Add env example.
- [x] Add setup instructions.

Acceptance:

- repo has README, AGENTS, PRD, ARCHITECTURE, TASKS, ACCEPTANCE_CRITERIA

### T0.3 Add base design system

- [x] Configure typography.
- [x] Configure muted lavender primary theme.
- [x] Add common Card, Badge, Button, Table patterns.
- [x] Add app shell layout.

Acceptance:

- design looks aligned with TuesdayOps mockups

## Milestone 1 — Auth and Agency Workspace

### T1.1 Supabase setup

- [x] Add Supabase client.
- [x] Add server/client helpers.
- [x] Add env variables.

Acceptance:

- app can connect to Supabase

### T1.2 Auth pages

- [x] Sign up page.
- [x] Sign in page.
- [x] Sign out action.
- [x] Protected app routes.

Acceptance:

- unauthenticated user cannot access dashboard

### T1.3 Agency workspace model

- [x] Create agencies table.
- [x] Create profiles table.
- [x] Create memberships table.
- [x] Add RLS policies.

Acceptance:

- user has agency membership after onboarding
- tenant data is scoped

### T1.4 Agency onboarding

- [x] Create agency form.
- [x] Add default branding fields.
- [x] Redirect to dashboard after creation.

Acceptance:

- new user can create agency workspace

## Milestone 2 — Clients and Workflows

### T2.1 Clients schema and service

- [x] Add clients table.
- [x] Add CRUD service.
- [x] Add validation schema.

Acceptance:

- create/list/update/archive clients works

### T2.2 Clients page

- [x] Build clients page.
- [x] Add client table.
- [x] Add filters/search.
- [x] Add empty state.

Acceptance:

- page matches MVP UX direction

### T2.3 Workflows schema and service

- [x] Add workflows table.
- [x] Add encrypted auth config handling.
- [x] Add CRUD service.
- [x] Add validation schema.

Acceptance:

- workflow endpoint can be stored without exposing secrets

### T2.4 Workflows page

- [x] Build workflow list.
- [x] Build add workflow form.
- [x] Build workflow detail shell.

Acceptance:

- user can add first workflow for a client

## Milestone 3 — Endpoint Health Checks

### T3.1 Checks schema

- [x] Add checks table.
- [x] Add check_runs table.
- [x] Add check config validation.

Acceptance:

- checks can be created for workflows

### T3.2 HTTP check runner

- [x] Implement HTTP request executor.
- [x] Support GET/POST.
- [x] Support headers.
- [x] Support timeouts.
- [x] Return status code and latency.

Acceptance:

- manual run can hit a valid endpoint and save check_run

### T3.3 Assertion engine

- [x] Implement field_exists assertion.
- [x] Implement equals assertion.
- [x] Implement not_contains assertion.
- [x] Implement status_code assertion.
- [x] Implement latency_under assertion.

Acceptance:

- assertion tests pass

### T3.4 Manual run check UI

- [x] Add Run Check button.
- [x] Show latest result.
- [x] Show run history.

Acceptance:

- user can manually run check from workflow detail page

## Milestone 4 — Scheduled Checks and Issues

### T4.1 Background job setup

- [x] Add Inngest or Trigger.dev.
- [x] Add scheduled check job.
- [x] Add retry behavior.

Acceptance:

- enabled checks run on schedule

### T4.2 Issue schema and service

- [x] Add issues table.
- [x] Add issue creation service.
- [x] Add severity mapping.
- [x] Add issue dedupe.

Acceptance:

- failed check creates issue
- repeated failure does not spam duplicates

### T4.3 Issues page

- [x] Build issue queue.
- [x] Add filters.
- [x] Add issue detail drawer.
- [x] Add assign/resolve/ignore actions.

Acceptance:

- user can resolve issue with note

### T4.4 Alerts

- [x] Add Resend integration.
- [x] Send email for high-severity issue.
- [x] Add alert-safe copy.

Acceptance:

- high severity issue sends redacted email alert

## Milestone 5 — Test Packs

### T5.1 Test pack schema

- [x] Add test_packs table.
- [x] Add test_cases table.
- [x] Add test_runs table.

Acceptance:

- test packs can be created

### T5.2 Test pack builder UI

- [x] Add test pack page.
- [x] Add create test case form.
- [x] Add assertion builder.

Acceptance:

- user can create at least one synthetic test case

### T5.3 Synthetic test runner

- [x] Execute test cases against workflow endpoint.
- [x] Store pass/fail results.
- [x] Update pass rate.
- [x] Create issue if failure threshold met.

Acceptance:

- user can run test pack and see pass/fail summary

## Milestone 6 — Reports

### T6.1 Reports schema

- [x] Add reports table.
- [x] Add report_items table.
- [x] Add report status lifecycle.

Acceptance:

- report record can be generated for a client/month

### T6.2 Report aggregation service

- [x] Aggregate check runs.
- [x] Aggregate issues caught/resolved.
- [x] Aggregate test pack results.
- [x] Generate summary data.

Acceptance:

- report preview shows real data

### T6.3 Report preview UI

- [x] Build report preview page.
- [x] Add report modules.
- [x] Add branding preview.

Acceptance:

- report is client-safe and readable

### T6.4 PDF generation

- [x] Implement PDF generation.
- [x] Store PDF in Supabase Storage.
- [x] Add download action.

Acceptance:

- generated report PDF can be downloaded

### T6.5 Send report email

- [x] Send report email via Resend.
- [x] Attach/link PDF.
- [x] Mark report sent.

Acceptance:

- report send action works

## Milestone 7A — Launch Readiness

### T7A.1 Deployment readiness

- [x] Add production env docs.
- [x] Add Vercel deployment notes.
- [x] Add Supabase migration notes.
- [x] Add smoke test checklist.

Acceptance:

- project can deploy and be used by design partners

### T7A.2 Dependency audit hardening

- [x] Clear high-severity Vite/esbuild audit path.
- [x] Clear moderate Next/PostCSS audit path without force downgrades.
- [x] Document Node runtime floor.

Acceptance:

- `npm audit --audit-level=moderate` reports zero vulnerabilities

## Milestone 7B — Onboarding and Demo Mode

### T7B.1 Onboarding wizard

- [ ] Add guided onboarding.
- [ ] Add first client step.
- [ ] Add first workflow step.
- [ ] Add first check run step.
- [ ] Add sample report step.

Acceptance:

- user can reach first check within 10 minutes

### T7B.2 Sample data mode

- [ ] Seed demo agency.
- [ ] Seed clients/workflows/checks/issues/reports.

Acceptance:

- demo dashboard is useful for sales calls

## Milestone 7C — Billing and Plan Limits

### T7C.1 Stripe billing

- [ ] Add Stripe checkout.
- [ ] Add customer portal.
- [ ] Add subscription state to agency.
- [ ] Add webhook handler.

Acceptance:

- user can start/manage subscription

### T7C.2 Plan limits

- [ ] Enforce client/workflow limits.
- [ ] Show upgrade prompts.

Acceptance:

- limits are enforced without breaking existing data
