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
- Updated docs: `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `TASKS.md`, and `CHANGELOG.md`.

## Tests Added Or Repaired

- Added DNS SSRF tests in `src/lib/security/endpoint-url-server.test.ts`.
- Expanded URL validation tests for exact endpoint preservation and hostname classification.
- Expanded HTTP runner tests for retry behavior and degraded status classification.
- Expanded scheduler tests for redacted failure logging.
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
npm run e2e
```

Results:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 56 test files and 306 tests.
- `npm run build`: passed.
- `npm run e2e`: passed, 8 Playwright tests.

Notable fix-loop commands:

- `npm run typecheck` initially caught a mocked DNS overload typing issue; fixed and reran successfully.
- `npm run e2e` initially exposed stale E2E assumptions around Settings button labels, workflow detail tabs, and Starter limits; specs were updated and full E2E reran successfully.

## Acceptance Confirmation

- User signs up/logs in: covered by auth pages and E2E using confirmed QA users for login.
- User creates agency workspace: covered by onboarding E2E.
- User adds a client: covered by multiple E2E flows.
- User adds workflow with full endpoint URL preserved exactly: fixed in URL validation/import paths and covered by tests.
- User configures method, expected status, max latency, timeout, frequency, optional auth, and simple assertions: manual workflow setup now exposes these controls.
- User clicks Run Check: covered by workflow/check E2E.
- App sends request safely: runner blocks unsafe endpoints, resolves DNS before production execution/import fetches, blocks redirects, applies timeout, response cap, redaction, retry, and rate limits.
- App records status, latency, status code, assertion results, timestamp, and error/reason: existing check-run persistence verified by unit/E2E.
- Run history updates immediately: covered by E2E.
- Workflow health becomes Healthy / Degraded / Failed: runner now supports all three status outcomes.
- Failed/degraded runs create issues automatically: covered by issue engine tests and E2E.
- User can assign, note, rerun, resolve, ignore, and mark reportable: assign/resolve-note/ignore existed; rerun and reportable toggles added. Ignore is the MVP's snooze/exclude path.
- User can generate a client report from real check/issue data: covered by report E2E.
- Report has web preview and PDF export: covered by report E2E and PDF tests.
- Demo data does not hide broken functionality: user-facing demo seeding remains removed; E2E uses real tenant records.
- Manual checks work: covered by E2E.
- Scheduled checks work: covered by scheduler E2E and scheduler route tests.
- Job failures are visible/logged: scheduler responses include failure counts, and batch failures now log redacted agency/check context.
- Checks have retries, timeout, max response size, and clear UI feedback: retry added; timeout/size cap/feedback verified in code and tests.
- Raw sensitive responses are not stored by default: runner stores redacted summaries only.
- Tenant isolation/RLS: migrations and service filters enforce `agency_id`; cross-tenant report download E2E remains in the suite.
- Secrets encrypted/redacted: workflow auth config remains server-only encrypted; run-log keys are hashed; UI does not display saved secrets.
- SSRF protection: localhost, loopback, private/link-local/metadata ranges, non-http(s), unsafe hostnames, and DNS-resolved private targets are blocked in production; redirects are not followed.
- Request timeout, response-size cap, and per-agency rate limits: present and tested.
- Reports use selected client/period real data and include monitored workflows, checks run, pass rate, issues caught/resolved, QA/test results, recommendations, and client-safe branding: report aggregation/PDF/E2E verified.

## Remaining Gaps

- Live Resend delivery and Stripe Checkout/Customer Portal still require provider-side safe production/test-mode credentials and domains to verify outside the local automated suite.
- Supabase Cron execution in production still depends on deployed Vault secrets and Cron configuration; the protected scheduler route and scheduled runner are verified locally/E2E.
