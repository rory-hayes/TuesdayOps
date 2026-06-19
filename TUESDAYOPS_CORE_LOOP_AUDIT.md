# TuesdayOps Core Loop Audit

Date: 2026-06-17

Scope: production-readiness pass for the core loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No full eval platform, trace explorer, workflow builder, CRM, client portal, native integration, model gateway, SSO, custom domain, marketplace, or advanced-permissions scope was added.

## What I Inspected

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, `SECURITY.md`, `REPORTING_SPEC.md`, and `TESTING.md`.
- Optional `TUESDAYOPS_V1_BUILD_VERIFICATION.md`: not present.
- Core app routes and components for onboarding, clients, workflows, checks, issues, reports, settings, and scheduler routes.
- Core services for workflow creation/import, HTTP check execution, assertion evaluation, scheduled checks, issue creation/actions, report aggregation/PDF/export, endpoint safety, secrets, rate limits, and tenant-scoped operational data.
- Supabase migrations for tenant tables, RLS/composite tenant keys, scheduled checks, reports, lifecycle fields, run-log keys, and persistent rate limits.
- Unit and E2E coverage for URL validation, SSRF controls, check execution, assertions, issue creation/actions, report aggregation/export, scheduler behavior, and cross-tenant report download.

## What Was Broken Or Incomplete

- Workflow endpoint validation returned `URL.toString()`, which could rewrite submitted URLs instead of preserving the full endpoint string exactly.
- SSRF checks blocked obvious private/local hostnames and IP literals, but did not resolve public-looking hostnames before execution/import fetches.
- HTTP checks had timeout and response-size caps, but did not retry transport/read failures.
- The runner collapsed non-status assertion failures into `failed`; it did not produce the intended `degraded` state for latency/content assertion misses.
- First workflow setup did not expose explicit timeout or simple response/JSON assertions.
- Issue detail/queue actions lacked direct source-check rerun and explicit report inclusion toggles.
- Scheduled check batch failures were counted but not logged with operator-safe context.
- Some E2E specs had drifted from the current UI labels/tabs and the updated Starter plan limits.
- Report generation used the capped dashboard snapshot (`100` check runs and `150` test runs per agency) before filtering by client/period, so monthly reports could silently omit real source data.
- Scheduled checks loaded a limited app-side batch before due filtering, which could miss due checks when a tenant had many enabled health checks.
- Workflow maintenance could not rotate endpoint credentials or edit the primary health-check timeout/assertions after setup.
- Public run-log ingestion rate-limited by bearer token but did not throttle unauthenticated random-token attempts before database work.
- Issue ignore was permanent and report-excluding; there was no time-boxed snooze path.
- Production smoke covered public readiness/security checks, but the repo did not have a dedicated deployed core-loop E2E command.

## What I Fixed

- Preserved submitted workflow endpoint URLs after trim-only validation.
- Added server-only DNS-aware endpoint safety for workflow execution and safe OpenAPI URL imports.
- Kept redirects blocked with `redirect: "manual"` and existing response-size caps/redacted summaries.
- Added one conservative retry for request transport/read failures only.
- Changed check status derivation so status-code/request failures are `failed`, while latency/content assertion misses are `degraded`.
- Added timeout, response-contains, and JSON-field-exists controls to the first workflow health-check setup.
- Added issue source-check rerun through the normal check execution/rate-limit path.
- Added issue report inclusion/exclusion controls without resolving or ignoring the issue.
- Added redacted scheduled-check failure logging.
- Added `getReportSourceData()` and switched manual/monthly report generation to uncapped selected-client, selected-period source rows.
- Added `public.get_due_health_checks()` and moved scheduled-check due selection into Postgres.
- Added workflow settings for safe encrypted credential rotation and primary health-check config edits.
- Added health-check edit forms and shared config builder for status, latency, timeout, request body, JSON, field, text, regex, and negative assertions.
- Replaced second-resolution `fetch` execution with pinned-address HTTP(S) transport after DNS safety validation.
- Added pre-auth IP/global throttling before public run-log bearer-token validation.
- Added `snoozed_until`, `snoozed` issue status, UI actions, audit events, and repeat-failure dedupe/reopen behavior.
- Added `npm run e2e:production` for deployed full core-loop verification without starting a local dev server.
- Updated docs: `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `TASKS.md`, and `CHANGELOG.md`.

## Tests Added Or Repaired

- Added DNS SSRF tests in `src/lib/security/endpoint-url-server.test.ts`.
- Expanded URL validation tests for exact endpoint preservation and hostname classification.
- Expanded HTTP runner tests for retry behavior and degraded status classification.
- Expanded scheduler tests for redacted failure logging.
- Added report source-data regression coverage proving reports are not capped by dashboard run limits.
- Added health-check config builder coverage.
- Updated scheduled-runner tests for database due-check selection.
- Updated HTTP runner tests for pinned transport behavior.
- Added public run-log pre-auth throttling route coverage.
- Added issue snooze/dedupe coverage.
- Updated workflow import tests for exact URL preservation.
- Extended E2E core-loop coverage in `e2e/drilldowns-feedback.spec.ts` for issue reportable toggle, rerun, assign, resolve with note, and resolved issue report data.
- Repaired E2E specs to match current workflow tabs, endpoint display, and Starter limits.

## Verification Results

Final passing commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx supabase db push
npm run e2e
npm run smoke:production
PRODUCTION_E2E_URL=https://tuesday-ops.vercel.app npm run e2e:production
npm audit --audit-level=moderate
```

Results:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 57 test files and 310 tests.
- `npm run build`: passed.
- `npm run e2e`: passed, 8 Playwright tests.
- `npm run smoke:production`: passed, 1 production smoke test.
- `PRODUCTION_E2E_URL=https://tuesday-ops.vercel.app npm run e2e:production`: passed, 1 full production core-loop Playwright test.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `npx supabase db push`: applied `20260617195500_core_loop_production_blockers.sql` to the linked remote Supabase project.

Notable fix-loop commands:

- `npm run typecheck` initially caught a mocked DNS overload typing issue; fixed and reran successfully.
- `npm run e2e` initially exposed stale E2E assumptions around Settings button labels, workflow detail tabs, and Starter limits; specs were updated and full E2E reran successfully.
- Focused blocker verification passed with `npm run test -- src/lib/data/operational-data.test.ts src/lib/checks/config.test.ts src/lib/checks/runner.test.ts src/lib/checks/scheduled-runner.test.ts src/lib/issues/engine.test.ts src/lib/issues/operations.test.ts src/app/api/public/run-log/route.test.ts src/lib/reports/scheduler.test.ts src/lib/security/endpoint-url-server.test.ts`.

## Acceptance Confirmation

- User signs up/logs in: covered by auth pages and E2E using confirmed QA users for login.
- User creates agency workspace: covered by onboarding E2E.
- User adds a client: covered by multiple E2E flows.
- User adds workflow with full endpoint URL preserved exactly: fixed in URL validation/import paths and covered by tests.
- User configures method, expected status, max latency, timeout, frequency, optional auth, and simple assertions: manual workflow setup now exposes these controls.
- User clicks Run Check: covered by workflow/check E2E.
- App sends request safely: runner blocks unsafe endpoints, resolves DNS before production execution/import fetches, pins execution to the validated public address, blocks redirects, applies timeout, response cap, redaction, retry, and rate limits.
- App records status, latency, status code, assertion results, timestamp, and error/reason: existing check-run persistence verified by unit/E2E.
- Run history updates immediately: covered by E2E.
- Workflow health becomes Healthy / Degraded / Failed: runner now supports all three status outcomes.
- Failed/degraded runs create issues automatically: covered by issue engine tests and E2E.
- User can assign, note, rerun, resolve, snooze, ignore, and mark reportable: supported by issue service actions and UI.
- User can generate a client report from real check/issue data: covered by report E2E.
- Report has web preview and PDF export: covered by report E2E and PDF tests.
- Demo data does not hide broken functionality: user-facing demo seeding remains removed; E2E uses real tenant records.
- Manual checks work: covered by E2E.
- Scheduled checks work: due selection is database-side through `public.get_due_health_checks()`, with scheduler E2E and route tests covering execution/idempotency.
- Job failures are visible/logged: scheduler responses include failure counts, and batch failures now log redacted agency/check context.
- Checks have retries, timeout, max response size, and clear UI feedback: retry added; timeout/size cap/feedback verified in code and tests.
- Raw sensitive responses are not stored by default: runner stores redacted summaries only.
- Tenant isolation/RLS: migrations and service filters enforce `agency_id`; cross-tenant report download E2E remains in the suite.
- Secrets encrypted/redacted: workflow auth config remains server-only encrypted; run-log keys are hashed; UI does not display saved secrets.
- SSRF protection: localhost, loopback, private/link-local/metadata ranges, non-http(s), unsafe hostnames, and DNS-resolved private targets are blocked in production; redirects are not followed; workflow checks connect to the validated public address to reduce DNS rebinding risk.
- Request timeout, response-size cap, per-agency rate limits, and pre-auth public run-log throttling: present and tested.
- Reports use selected client/period real data and include monitored workflows, checks run, pass rate, issues caught/resolved, QA/test results, recommendations, and client-safe branding: generation now uses uncapped selected-client period source data and is covered by regression/unit/E2E tests.

## Remaining Gaps

- Live Resend delivery and Stripe Checkout/Customer Portal still require provider-side safe production/test-mode credentials and domains to verify outside the local automated suite.
- Supabase Cron trigger timing in production still depends on deployed Vault secrets and Cron configuration; the protected scheduler route, due-check selector, and scheduled runner are verified locally/E2E.

## 2026-06-19 Full Repo And Functional Rescan

Reason for rescan: confirm whether the core offering is locked in after the UI/onboarding polish and determine whether any parallel Codex thread work still needs fixing or merging.

### Thread And Git State

- Local branch: `main`.
- Remote tracking: `main` was aligned with `origin/main` before this test-hardening change.
- Latest pushed commit before this rescan: `9656595 Add first-run activation wizard`.
- `git branch --remotes --no-merged main` returned no unmerged remote branches.
- All visible local `codex/*` work branches were already merged into `main`; the older blocker branches are stale/behind current `main`, not pending work.
- Codex thread search for TuesdayOps work found this active thread and one unrelated/older EvalOps audit thread; I did not find an active unmerged TuesdayOps blocker thread.

### Blocker Found

The core app was functionally green on lint, typecheck, tests, build, smoke, audit, and E2E, but `npm run test:coverage` initially failed the repository's production gate:

```txt
Branches: 90.84%
Required: 95%
```

This mattered because `ACCEPTANCE_CRITERIA.md`, `TASKS.md`, and `README.md` all treat the 95% branch coverage gate as part of MVP service/API readiness.

### Fix Made

No product scope was expanded and no runtime behavior was changed. I added focused tests around existing production paths:

- `src/lib/checks/runner.test.ts`
  - pinned HTTP transport with a local server
  - response summary redaction
  - POST body/content-type behavior
  - oversized response cap/truncation
  - configured timeout abort behavior
- `src/lib/security/rate-limit.test.ts`
  - default admin-client limiter path
  - fail-closed RPC error and no-row behavior
  - normalized empty scope fallback
- `src/lib/test-packs/runner.test.ts`
  - missing synthetic input default
  - blank optional assertion fields
  - repeat failure count fallback
- `src/app/api/public/run-log/route.test.ts`
  - forwarded/real IP pre-auth rate-limit identifiers
  - invalid bearer cache expiry and revalidation
- `src/lib/workflows/onboarding.test.ts`
  - simple cURL import without optional flags
  - malformed optional cURL header tolerance
  - OpenAPI fallback/error branches
  - blank/non-operation YAML lines
  - incomplete optional Postman fields

### Commands Run

All Node commands were run with the bundled supported Node runtime:

```bash
git status --short --branch
git branch --remotes --no-merged main
git branch --merged main --format='%(refname:short)'
npm run lint
npm run typecheck
npm run test
npm audit --audit-level=moderate
npm run build
npm run smoke:production
npm run test:coverage
npx vitest run src/lib/checks/runner.test.ts src/lib/security/rate-limit.test.ts src/lib/test-packs/runner.test.ts
npx vitest run src/app/api/public/run-log/route.test.ts src/lib/workflows/onboarding.test.ts
npm run e2e
```

### Results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 68 test files and 379 tests.
- `npm run test:coverage`: passed, 68 test files and 379 tests.
- Final coverage: statements 98.52%, branches 95.14%, functions 100%, lines 98.47%.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `npm run build`: passed.
- `npm run smoke:production`: passed, 1 production smoke test.
- `npm run e2e`: passed, 8 Playwright tests.

### E2E Coverage Reconfirmed

The maintained Playwright suite passed locally against the configured QA Supabase environment and covered:

- confirmed auth and agency onboarding
- client creation
- workflow manual setup and cURL import
- manual check execution and persisted check run history
- protected scheduled checks
- issue creation, assignment, rerun, reportable toggle, note, resolution, and reporting
- synthetic test-pack failure and recovery
- report generation from real stored check/issue/test data
- web preview, PDF export/download, safe send failure, and cross-tenant PDF rejection
- billing limit feedback and onboarding/demo-data safety

### Verdict

The core offering is locked in from the current local repository and functional test perspective. I found no unmerged thread/branch work requiring integration, and the only blocker found in this rescan, the failing coverage gate, is fixed and verified.

Remaining production caveats are unchanged:

- Real Resend delivery should still be tested with a real recipient/domain before paid launch.
- Stripe Checkout/Portal should still be verified in test mode with live provider credentials before paid launch.
- Supabase Cron timing depends on deployed Vault/Cron configuration, although the protected scheduler route and scheduled runner are covered locally and by E2E.
