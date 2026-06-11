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

- [ ] Add Supabase client.
- [ ] Add server/client helpers.
- [ ] Add env variables.

Acceptance:

- app can connect to Supabase

### T1.2 Auth pages

- [ ] Sign up page.
- [ ] Sign in page.
- [ ] Sign out action.
- [ ] Protected app routes.

Acceptance:

- unauthenticated user cannot access dashboard

### T1.3 Agency workspace model

- [ ] Create agencies table.
- [ ] Create profiles table.
- [ ] Create memberships table.
- [ ] Add RLS policies.

Acceptance:

- user has agency membership after onboarding
- tenant data is scoped

### T1.4 Agency onboarding

- [ ] Create agency form.
- [ ] Add default branding fields.
- [ ] Redirect to dashboard after creation.

Acceptance:

- new user can create agency workspace

## Milestone 2 — Clients and Workflows

### T2.1 Clients schema and service

- [ ] Add clients table.
- [ ] Add CRUD service.
- [ ] Add validation schema.

Acceptance:

- create/list/update/archive clients works

### T2.2 Clients page

- [ ] Build clients page.
- [ ] Add client table.
- [ ] Add filters/search.
- [ ] Add empty state.

Acceptance:

- page matches MVP UX direction

### T2.3 Workflows schema and service

- [ ] Add workflows table.
- [ ] Add encrypted auth config handling.
- [ ] Add CRUD service.
- [ ] Add validation schema.

Acceptance:

- workflow endpoint can be stored without exposing secrets

### T2.4 Workflows page

- [ ] Build workflow list.
- [ ] Build add workflow form.
- [ ] Build workflow detail shell.

Acceptance:

- user can add first workflow for a client

## Milestone 3 — Endpoint Health Checks

### T3.1 Checks schema

- [ ] Add checks table.
- [ ] Add check_runs table.
- [ ] Add check config validation.

Acceptance:

- checks can be created for workflows

### T3.2 HTTP check runner

- [ ] Implement HTTP request executor.
- [ ] Support GET/POST.
- [ ] Support headers.
- [ ] Support timeouts.
- [ ] Return status code and latency.

Acceptance:

- manual run can hit a valid endpoint and save check_run

### T3.3 Assertion engine

- [ ] Implement field_exists assertion.
- [ ] Implement equals assertion.
- [ ] Implement not_contains assertion.
- [ ] Implement status_code assertion.
- [ ] Implement latency_under assertion.

Acceptance:

- assertion tests pass

### T3.4 Manual run check UI

- [ ] Add Run Check button.
- [ ] Show latest result.
- [ ] Show run history.

Acceptance:

- user can manually run check from workflow detail page

## Milestone 4 — Scheduled Checks and Issues

### T4.1 Background job setup

- [ ] Add Inngest or Trigger.dev.
- [ ] Add scheduled check job.
- [ ] Add retry behavior.

Acceptance:

- enabled checks run on schedule

### T4.2 Issue schema and service

- [ ] Add issues table.
- [ ] Add issue creation service.
- [ ] Add severity mapping.
- [ ] Add issue dedupe.

Acceptance:

- failed check creates issue
- repeated failure does not spam duplicates

### T4.3 Issues page

- [ ] Build issue queue.
- [ ] Add filters.
- [ ] Add issue detail drawer.
- [ ] Add assign/resolve/ignore actions.

Acceptance:

- user can resolve issue with note

### T4.4 Alerts

- [ ] Add Resend integration.
- [ ] Send email for high-severity issue.
- [ ] Add alert-safe copy.

Acceptance:

- high severity issue sends redacted email alert

## Milestone 5 — Test Packs

### T5.1 Test pack schema

- [ ] Add test_packs table.
- [ ] Add test_cases table.
- [ ] Add test_runs table.

Acceptance:

- test packs can be created

### T5.2 Test pack builder UI

- [ ] Add test pack page.
- [ ] Add create test case form.
- [ ] Add assertion builder.

Acceptance:

- user can create at least one synthetic test case

### T5.3 Synthetic test runner

- [ ] Execute test cases against workflow endpoint.
- [ ] Store pass/fail results.
- [ ] Update pass rate.
- [ ] Create issue if failure threshold met.

Acceptance:

- user can run test pack and see pass/fail summary

## Milestone 6 — Reports

### T6.1 Reports schema

- [ ] Add reports table.
- [ ] Add report_items table.
- [ ] Add report status lifecycle.

Acceptance:

- report record can be generated for a client/month

### T6.2 Report aggregation service

- [ ] Aggregate check runs.
- [ ] Aggregate issues caught/resolved.
- [ ] Aggregate test pack results.
- [ ] Generate summary data.

Acceptance:

- report preview shows real data

### T6.3 Report preview UI

- [ ] Build report preview page.
- [ ] Add report modules.
- [ ] Add branding preview.

Acceptance:

- report is client-safe and readable

### T6.4 PDF generation

- [ ] Implement PDF generation.
- [ ] Store PDF in Supabase Storage.
- [ ] Add download action.

Acceptance:

- generated report PDF can be downloaded

### T6.5 Send report email

- [ ] Send report email via Resend.
- [ ] Attach/link PDF.
- [ ] Mark report sent.

Acceptance:

- report send action works

## Milestone 7 — Billing, Onboarding, Polish

### T7.1 Stripe billing

- [ ] Add Stripe checkout.
- [ ] Add customer portal.
- [ ] Add subscription state to agency.
- [ ] Add webhook handler.

Acceptance:

- user can start/manage subscription

### T7.2 Plan limits

- [ ] Enforce client/workflow limits.
- [ ] Show upgrade prompts.

Acceptance:

- limits are enforced without breaking existing data

### T7.3 Onboarding wizard

- [ ] Add guided onboarding.
- [ ] Add first client step.
- [ ] Add first workflow step.
- [ ] Add first check run step.
- [ ] Add sample report step.

Acceptance:

- user can reach first check within 10 minutes

### T7.4 Sample data mode

- [ ] Seed demo agency.
- [ ] Seed clients/workflows/checks/issues/reports.

Acceptance:

- demo dashboard is useful for sales calls

### T7.5 Deployment readiness

- [ ] Add production env docs.
- [ ] Add Vercel deployment notes.
- [ ] Add Supabase migration notes.
- [ ] Add smoke test checklist.

Acceptance:

- project can deploy and be used by design partners
