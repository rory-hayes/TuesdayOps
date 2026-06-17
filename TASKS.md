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
- [x] Add default workspace fields.
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
- [x] Move quick import and manual setup into a guided Add workflow dialog.
- [x] Build workflow detail shell.

Acceptance:

- user can see the workflow registry first and add the first workflow for a client from a guided modal

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

- [x] Add Supabase Cron scheduler trigger.
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

- [x] Add guided onboarding.
- [x] Add first client step.
- [x] Add first workflow step.
- [x] Add first check run step.
- [x] Add first report step.

Acceptance:

- user can reach first check within 10 minutes

### T7B.2 Demo seeding removal

- [x] Remove user-facing demo seeding.
- [x] Remove dormant sample-data seeding server action.

Acceptance:

- activation uses real tenant client, workflow, check run, and report data

## Milestone 7C — Billing and Plan Limits

### T7C.1 Stripe billing

- [x] Add Stripe checkout.
- [x] Add customer portal.
- [x] Add subscription state to agency.
- [x] Add webhook handler.

Acceptance:

- user can start/manage subscription

### T7C.2 Plan limits

- [x] Enforce client/workflow limits.
- [x] Show upgrade prompts.

Acceptance:

- limits are enforced without breaking existing data

## Milestone 8 — QA Hardening

### T8.1 Tenant isolation coverage

- [x] Add report download cross-tenant E2E coverage.

Acceptance:

- authenticated users cannot download another agency's report PDF

### T8.2 Scheduler smoke stability

- [x] Add targeted protected scheduler trigger support for QA smoke tests.
- [x] Update scheduled-check and alert E2E to target their created health check.

Acceptance:

- E2E scheduled checks are not crowded out by older enabled checks in a shared Supabase project

### T8.3 Billing limit coverage

- [x] Add starter workflow limit E2E coverage.

Acceptance:

- starter agencies can create three workflows and are blocked from creating a fourth

### T8.4 Webhook route safety coverage

- [x] Add Stripe webhook route tests for missing signatures, invalid signatures, and duplicate events.

Acceptance:

- invalid webhook requests do not touch billing state
- duplicate webhook events are acknowledged without duplicate inserts or mutations

## Milestone 9 — Production Provider Readiness

### T9.1 Provider readiness checks

- [x] Add server-safe readiness checks for app runtime, Supabase, Supabase Cron scheduler, Resend, Stripe, Sentry, and optional PostHog analytics.
- [x] Add public `/api/health` payload with no secret disclosure.
- [x] Keep launch-blocking provider configuration in `/api/health` and deployment checks, outside user-facing Settings.

Acceptance:

- readiness output contains only configured/missing status
- launch gate is blocked when required provider env vars are missing
- user-facing Settings does not expose internal provider readiness gates

## Milestone 10 — Seamless Workflow Onboarding

### T10.1 Workflow import paths

- [x] Add workflow import parser for URL, cURL, OpenAPI JSON/YAML/URL, and Postman collection JSON.
- [x] Add quick import UI on Workflows.
- [x] Keep the workflow registry visible first, with quick import launched from Add workflow.
- [x] Create imported workflow plus first health check through the same tenant/billing/encryption path as manual creation.
- [x] Support request bodies for imported and manual POST/PATCH/PUT health checks.

Acceptance:

- user can create a workflow from a cURL command
- imported auth secrets are encrypted before persistence
- imported workflows still enforce starter plan limits

## Milestone 11 — Security and Tenant Hardening

### T11.1 Endpoint safety guard

- [x] Block private/local workflow endpoints in production.
- [x] Re-check endpoint safety before HTTP runner execution.
- [x] Document local override through `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true`.

Acceptance:

- localhost, loopback, private IPv4, link-local, and metadata endpoints are blocked unless explicitly allowed for local/private tests

## Milestone 12 — Operational Reliability

### T12.1 Operational gate

- [x] Add tenant operational reliability checks for enabled checks, stale workflows, high-risk open issues, and ready/sent reports.
- [x] Show operational gate on Overview.

Acceptance:

- Overview highlights operational items that need attention before handoff

## Milestone 13 — Report Polish

### T13.1 Report readiness

- [x] Add report quality scoring for source data, sections, recommendations, and open high-risk issues.
- [x] Show report readiness in the report preview.
- [x] Add monitoring coverage line to PDF and report email artifacts.

Acceptance:

- reports show ready/review/blocked status before send/export
- client-facing artifacts include concise monitoring coverage

## Milestone 14 — Launch Gate and QA Handoff

### T14.1 Documentation and QA report

- [x] Update roadmap, deployment, testing, security, and API docs for production readiness.
- [x] Add QA handoff report for the production-ready milestone branch.

Acceptance:

- QA engineers have test results, current state, known gaps, and launch recommendations

## Milestone 15 — Test Coverage Hardening

### T15.1 Unit coverage gate

- [x] Add Vitest V8 coverage reporting.
- [x] Enforce 95% global coverage thresholds for statements, branches, functions, and lines.
- [x] Expand unit coverage for core MVP services and API routes.

Acceptance:

- `npm run test:coverage` passes the 95% coverage gate

### T15.2 Acceptance coverage

- [x] Add drill-down and action-feedback acceptance coverage across client, workflow, issue, and report flows.
- [x] Extend billing-limit E2E coverage for upgrade CTA prompts.

Acceptance:

- Playwright coverage exercises the core MVP loop and verifies critical navigation/feedback paths

## Milestone 16 — P0/P1/P2 Continuation

### T16.1 Synthetic issue recovery

- [x] Resolve the active synthetic issue for a test case when a later synthetic run passes.
- [x] Keep failed synthetic runs creating or updating one active reportable issue per test case fingerprint.
- [x] Add unit coverage for synthetic issue create, repeat-failure update, recovery, and skipped-run no-op behavior.

Acceptance:

- A passing synthetic run clears the matching active issue from the maintenance queue without hiding it from reports.

### T16.2 Client-ready report PDF polish

- [x] Replace the minimal report PDF text stream with a structured one-page client report layout.
- [x] Add cover metadata, executive summary, operations scorecard, value-delivered section, report sections, next actions, and a client-safe footer.
- [x] Keep report text redaction and add unit coverage for the client-ready PDF artifact.

Acceptance:

- Generated PDFs remain downloadable and report-safe while presenting the monthly proof-of-work report in a clearer client-ready structure.

### T16.3 Production smoke checks

- [x] Add a repeatable production smoke checker for the Vercel app URL.
- [x] Verify public `/api/health` is launch-ready and does not expose secret-shaped values.
- [x] Verify temporary Sentry example routes stay gated in production.
- [x] Verify the protected scheduler route rejects unauthenticated production requests.
- [x] Verify authenticated app routes redirect unauthenticated visitors to sign-in.
- [x] Verify unsigned Stripe webhook requests are rejected in production.
- [x] Verify browser security headers are present and framework disclosure is disabled.

Acceptance:

- Operators and QA can run `npm run smoke:production` against the Vercel URL and get a readable pass/fail report for public readiness, auth boundaries, billing webhook protection, privileged-route protection, and browser security headers.

## Milestone 17 — Full E2E QA Hardening

### T17.1 Audit bug table remediation

- [x] Redact report-send provider configuration details from user feedback, report rows, and audit metadata.
- [x] Sanitize report-safe text across report drafts, PDFs, and email artifacts.
- [x] Add password reset request/update screens and a Supabase recovery callback.
- [x] Add assertive error regions, a skip link, accessible client search labeling, and offline status feedback.
- [x] Add in-context browser validation for client, issue, check, and synthetic test-case forms.
- [x] Mask visible cURL import secrets before workflow import while preserving encrypted server-side save behavior.
- [x] Add confirmation prompts for client archive and issue ignore actions.
- [x] Replace misleading Settings provider status copy with operator-managed integration copy.
- [x] Fix unrunnable test-pack timestamps to display “never run.”
- [x] Re-audit production build across Chromium, Firefox, WebKit, desktop, tablet, and mobile logged-out states plus authenticated core flows.

Acceptance:

- Full unit, lint, typecheck, build, and Playwright suites pass.
- Production-build browser audit passes for auth redirects, reset validation, responsive layouts, accessible naming, client creation, workflow import masking, offline feedback, and protected HTTP routes.
- Local production smoke is expected to remain degraded until deployment-level scheduler, email, billing, and observability env vars are configured.

## Milestone 18 — Design-Partner Readiness

### T18.1 Lifecycle controls

- [x] Add workflow archive behavior.
- [x] Add check disable behavior.
- [x] Add test-pack edit/disable behavior.
- [x] Add test-case edit/archive behavior.

Acceptance:

- active views hide archived/disabled records without deleting historical run, issue, or report evidence

### T18.2 External run logging

- [x] Add workflow-scoped run-log API key generation, hashing, rotation, and revocation.
- [x] Add `POST /api/public/run-log`.
- [x] Persist external logs as check runs and create/update issues for degraded/failed logs.

Acceptance:

- external run logs are accepted only with a valid key for the matching workflow
- plaintext keys are only shown once and are not stored

### T18.3 Change validation and dashboard trends

- [x] Add model/prompt comparison summaries for reports and workflow detail.
- [x] Add overview, client, and workflow chart helpers/components.

Acceptance:

- stored `model`, `prompt_version`, latency, cost, and pass-rate data can be reviewed before client reporting

### T18.4 Report automation

- [x] Add client report automation schedule fields.
- [x] Add protected monthly report scheduler route.
- [x] Generate due prior-month report drafts without sending email automatically.

Acceptance:

- due opted-in clients receive draft reports and retain manual send/export control

### T18.5 Workflow import polish

- [x] Support OpenAPI JSON, YAML, pasted text, and safe public URL imports.
- [x] Keep endpoint safety validation on imported workflow endpoints.

Acceptance:

- a safe public OpenAPI document can create a normal workflow plus first health check

### T18.6 Public landing page

- [x] Add public logged-out `/` page.
- [x] Preserve authenticated `/` dashboard behavior and onboarding redirect for authenticated users without workspaces.

Acceptance:

- first-time visitors see a focused TuesdayOps offer without exposing app routes or adding ignored scope

### T18.7 Documentation alignment

- [x] Update README, architecture, data model, API spec, deployment, testing, roadmap, tech stack, changelog, and task docs.

Acceptance:

- docs describe implemented behavior and clearly defer Slack alerts, PostHog, brand-logo work, client portal, and browser synthetic checks

### T18.8 Launch follow-up verification

- [x] Re-test the client table drill-down in browser automation.
- [!] Verify report email send with a safe production recipient/domain.
- [x] Verify PDF download in a browser-backed E2E context.
- [!] Run one Stripe test-mode checkout/customer portal pass.

Acceptance:

- design-partner onboarding can proceed once client drill-down is retested and provider-side checks are either passed or explicitly blocked by missing safe credentials/configuration

Notes:

- `e2e/drilldowns-feedback.spec.ts` passed after applying the design-partner readiness migration to the linked Supabase project.
- `e2e/reports.spec.ts` verified generated PDF response status, `application/pdf` content type, and PDF bytes from the authenticated browser context.
- Live production report email delivery still needs a confirmed safe recipient/domain.
- Stripe Checkout/Customer Portal still needs an explicit test-mode provider pass to avoid unintended billing side effects.

## Milestone 19 — Core Loop Production Audit

### T19.1 Core-loop readiness fixes

- [x] Preserve submitted workflow endpoint URLs instead of rewriting them through URL normalization.
- [x] Add DNS-aware SSRF protection for workflow execution and OpenAPI URL imports.
- [x] Classify non-status assertion misses as degraded while keeping request/status failures failed.
- [x] Expose timeout and simple response/JSON assertions in first workflow health-check setup.
- [x] Add issue rerun and report-inclusion controls.
- [x] Log scheduled-check batch failures with redacted operator-safe context.
- [x] Expand unit and E2E coverage for the tightened core loop.
- [x] Add `TUESDAYOPS_CORE_LOOP_AUDIT.md`.

Acceptance:

- Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report remains the only product loop expanded by this pass.
