# TuesdayOps Testing Strategy

## Testing philosophy

TuesdayOps is a controls and proof product. Tests should prioritize correctness, tenant isolation, deterministic checks, and report accuracy.

## Test types

### Unit tests

Use for:

- assertion evaluation
- check status calculation
- issue severity mapping
- report aggregation logic
- redaction helpers
- pricing/limit helpers

### Integration tests

Use for:

- client/workflow/check API routes
- check runner service
- issue creation flow
- report generation flow

### E2E/smoke tests

Use Playwright or the in-app browser for:

- sign up/login
- create client
- create workflow
- run check
- create issue
- generate report

Current Milestones 1-3 E2E status:

- Static verification passes with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Full authenticated E2E has passed against the remote Supabase project from the local app.
- Covered flow: sign in, onboarding, client creation, workflow creation, manual check run, persisted run history, sign-out redirect, second-tenant empty state, and cross-tenant workflow 404.
- Local Supabase startup was attempted first, but Docker killed the database-only startup with `exit 137`; remote Supabase was used for final E2E.

Current Milestone 4 issue-management E2E status:

- Static verification passes with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Applied the issue-dedupe Supabase migration to the linked remote project.
- Full authenticated E2E passed against the remote Supabase project from the local app.
- Covered flow: confirmed QA user sign-in, onboarding, client creation, failing workflow creation, manual failed check run, issue creation, repeated failed check dedupe, occurrence count update, assignment, resolution note, resolved-status filter, sign-out redirect, and protected `/issues` redirect.
- Public sign-up currently creates unconfirmed users in this Supabase project; E2E used a disposable confirmed QA user created through the Supabase Admin API with a service-role key captured only in process memory.

Current Milestone 4 scheduled-check E2E status:

- Static verification passes with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Applied the scheduled-check Supabase migration to the linked remote project.
- `npm run e2e -- e2e/scheduled-checks.spec.ts` passed against the local app and remote Supabase project.
- Covered flow: confirmed QA user sign-in, onboarding, client creation, workflow creation, protected scheduler trigger, scheduled `check_runs` insert with `trigger = scheduled` and `scheduled_for`, issue creation from the scheduled failed run, second immediate scheduler trigger without duplicate run creation, and unauthorized scheduler trigger returning `401`.
- Browser plugin DOM/log smoke check passed for the sign-in route, but screenshot capture timed out through the in-app browser. Playwright CLI fallback captured the final workflow and issue screenshots.
- Production scheduling uses Supabase Cron and Vault. The shared runner is verified through the protected scheduler route; full production scheduling is ready only after the `tuesdayops-run-due-checks` Cron job and Vault secrets are configured.

Current Milestone 4 alert E2E status:

- Alert policy/unit coverage passes for high/critical send rules, repeat-dedupe suppression, and redacted email copy.
- `npm run e2e -- e2e/alerts.spec.ts` passed against the local app and remote Supabase project.
- Covered flow: confirmed QA user sign-in, onboarding, client creation, high-severity scheduled workflow failure, issue creation, alert attempt recording, and missing Resend config recorded on the issue without breaking the check runner.
- Live Resend delivery was not executed because `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are not configured locally or in Vercel yet.

Current Milestone 5 test-pack E2E status:

- Synthetic runner unit coverage passes for test-case assertion construction, runnable config creation, test-run insert shaping, synthetic issue repeat updates, and test-pack pass-rate summaries.
- Applied the test-pack Supabase migration to the linked remote project.
- `npm run e2e -- e2e/test-packs.spec.ts` passed against the local app and remote Supabase project.
- Covered flow: confirmed QA user sign-in, onboarding, client creation, workflow creation, test pack creation, test case creation, manual pack run, persisted failed `test_runs` row, issue creation linked to `test_run_id`, Checks page failed state, and issue visibility in the issue queue.
- Browser plugin DOM smoke check confirmed the rendered `/checks` page includes the synthetic pack panel, add-pack/add-case controls, run-pack control, and failed run state. Screenshot capture timed out through the in-app browser, but Playwright CLI E2E captured the run state successfully.

Current Milestone 6 report E2E status:

- Report aggregation unit coverage passes for period-bounded check runs, issues caught/resolved, synthetic run metrics, report-safe items, and redaction of raw response summaries.
- PDF helper coverage passes for valid PDF byte generation and report email copy with a download link.
- Applied the reports Supabase migration to the linked remote project.
- `npm run e2e -- e2e/reports.spec.ts` passed against the local app and remote Supabase project.
- Covered flow: confirmed QA user sign-in, onboarding, client creation, workflow creation, manual failed check run, issue creation, monthly report generation, report preview, PDF generation, authenticated PDF download, and Resend send status handling.
- Full Playwright suite passed with scheduled checks, alerts, test packs, and reports: `4 passed`.

Current Milestone 7A launch-readiness status:

- Updated the test toolchain to Vite 8 and `@vitejs/plugin-react` 6, then pinned Next's nested PostCSS dependency to the patched `8.5.10` line through npm overrides.
- Added a Node.js runtime floor of `>=20.19.0`; Node 22+ is recommended for Vercel production.
- Added `DEPLOYMENT.md` with production env docs, Vercel notes, Supabase migration notes, and a post-deploy smoke checklist.
- `npm audit --audit-level=moderate` now returns `found 0 vulnerabilities`.
- Full verification passed with Node 25.6.1:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` (`12 passed`, `37 passed`)
  - `npm run build`
  - `npm run e2e` (`4 passed`)

Current Milestone 7B onboarding status:

- Added unit coverage for onboarding progress calculation and non-demo activation checklist copy.
- Applied the onboarding demo Supabase migration to the linked remote project.
- `npm run e2e -- e2e/onboarding-demo.spec.ts` passed against the local app and remote Supabase project.
- Covered flow: confirmed QA user sign-in, agency onboarding, activation checklist state, no visible demo seeding control, and no tenant demo client rows created.

Current Milestone 7C billing/limits status:

- Added unit coverage for plan-limit decisions and Stripe webhook mapping helpers.
- Applied the billing and plan limits Supabase migration to the linked remote project.
- `npm run e2e -- e2e/billing-limits.spec.ts` passed against the local app and remote Supabase project.
- Covered flow: confirmed QA user sign-in, agency onboarding, Settings billing usage display, missing Stripe config handled safely, starter client creation, and starter limit enforcement with upgrade copy.
- Full Playwright suite passed with onboarding, billing limits, scheduled checks, alerts, test packs, and reports: `6 passed`.

Current Milestone 8 QA-hardening status:

- Added route-level Stripe webhook coverage for missing signatures, invalid signatures, and duplicate event idempotency.
- Added targeted scheduler smoke support so E2E can run the current test's check even when the shared Supabase project contains older enabled health checks.
- Expanded report E2E coverage so a second authenticated agency receives `404` when requesting the first agency's generated PDF download URL.
- Expanded billing E2E coverage so a starter agency can create three workflows and is blocked from creating a fourth with upgrade copy.
- Focused verification passed:
  - `npm run test -- src/app/api/stripe/webhook/route.test.ts` (`17 passed`, `49 passed`)
  - `npx vitest run src/lib/checks/scheduler.test.ts src/lib/checks/scheduled-runner.test.ts` verifies targeted scheduler selection
  - `npm run e2e -- e2e/billing-limits.spec.ts e2e/reports.spec.ts` (`2 passed`)

Current Milestones 9-14 production-readiness status:

- Milestone 9 added provider readiness checks and public `/api/health` coverage.
- Milestone 10 added quick workflow import from URL, cURL, OpenAPI JSON/YAML/URL, and Postman collection JSON.
- Milestone 11 added endpoint safety validation to block localhost/private-network/link-local/metadata endpoints in production.
- Milestone 12 added operational reliability scoring for enabled checks, stale workflow data, high-risk issues, and report queue state.
- Milestone 13 added report quality scoring and client-facing monitoring coverage lines in PDF/email artifacts.
- Focused verification passed during implementation:
  - `npx vitest run src/lib/production/readiness.test.ts`
  - `npx vitest run src/lib/workflows/onboarding.test.ts`
  - `npm run e2e -- e2e/workflow-onboarding.spec.ts`
  - `npx vitest run src/lib/security/endpoint-url.test.ts src/lib/checks/execution.test.ts src/lib/checks/scheduled-runner.test.ts`
  - `npx vitest run src/lib/production/operational-reliability.test.ts`
  - `npm run e2e -- e2e/billing-limits.spec.ts e2e/workflow-onboarding.spec.ts`
  - `npx vitest run src/lib/reports/quality.test.ts src/lib/reports/pdf.test.ts`
  - `npm run e2e -- e2e/reports.spec.ts`
- Full branch verification should include:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run e2e`
  - `npm audit --audit-level=moderate`

Current P0/P1/P2 continuation status on 2026-06-15:

- PostHog analytics is intentionally skipped for now and no longer blocks `/api/health` launch readiness; Sentry remains required for observability readiness.
- Added readiness coverage for the skipped-PostHog path.
- Hardened Playwright client-creation selectors to scope inputs to the active New Client dialog after full e2e found an ambiguity with inline client edit fields.
- Added server-side and UI safeguards so blocked reports cannot be exported, directly downloaded, or sent until readiness blockers are resolved.
- Added unit coverage and server-action hardening so client, workflow, and issue mutations fail clearly when tenant-scoped updates touch no row.
- Added unit coverage for report-send redirects so failed email delivery/configuration attempts show an error instead of a success-style notice.
- Added acceptance coverage for Checks-page success feedback after test pack creation, test case creation, and synthetic pack runs.
- Added acceptance coverage that synthetic pack runs show a pending `Running...` state before completion feedback.
- Added acceptance coverage that onboarding workspace creation shows a pending `Creating...` state before redirecting.
- Added unit coverage for billing error formatting so customer-facing Settings redirects do not expose Stripe env var names, emails, or tokens.
- Added unit coverage for auth and onboarding error formatting so customer-facing redirects do not expose provider/database internals.
- Added unit coverage and shared safe feedback handling so client, workflow, check, test-pack, issue, report, and alert action failures do not expose provider/database internals.
- Added unit coverage for synthetic issue recovery so passing reruns resolve the matching active synthetic issue, skipped runs do not resolve, and failed reruns still dedupe.
- Extended test-pack acceptance coverage so a failed synthetic issue is resolved after a later passing rerun and is hidden by the open-issues filter.
- Added unit coverage that generated PDFs include a client-ready cover, executive summary, operations scorecard, value-delivered section, next actions, and bold layout resource.
- Added unit coverage and a live command for production smoke checks across `/api/health`, gated Sentry example routes, app-route auth redirects, scheduler route protection, unsigned Stripe webhook rejection, and browser security headers.
- Added acceptance coverage that Overview surfaces operations-readiness signals alongside drilldowns.
- Playwright runs E2E serially by default to avoid shared remote-Supabase contention; set `PLAYWRIGHT_WORKERS` to opt into parallel local runs.
- Verification passed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:coverage` (`40 passed`, `228 passed`; branch coverage `95.3%`)
  - `npm run build`
  - `npm run e2e` (`8 passed`)
  - `npm run smoke:production`
  - `npm audit --audit-level=moderate`

Current design-partner readiness implementation status on 2026-06-16:

- Added workflow/check/test-pack/test-case lifecycle unit coverage for archive, disable, and edit payload shaping.
- Added public run-log API coverage for hashed workflow keys, invalid auth, payload validation, check-run insertion, workflow summary updates, and issue creation.
- Added model/prompt comparison coverage and report aggregation coverage for `model_prompt_changes` items.
- Added dashboard chart helper coverage for pass-rate trends, run-volume series, and issue severity series.
- Added monthly report scheduler coverage for due-client selection, prior-month period calculation, draft generation, and next-due advancement.
- Added OpenAPI YAML and safe public URL import coverage.
- Added public landing-page content coverage that keeps ignored scope out of the logged-out offer.
- Applied pending remote Supabase migration `20260616193000_design_partner_readiness_lifecycle` after E2E initially failed against the old schema (`workflows.archived_at` missing). A follow-up dry run reported the remote database was up to date.
- Rendered the public logged-out page from a production build at desktop and mobile widths; the first screenshot caught a black-on-black CTA link caused by the global anchor color rule, and the CTA was fixed with explicit white text.
- Verification passed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` (`54 passed`, `286 passed`)
  - `npm run test:coverage` (statements `98.78%`, branches `95.08%`, functions `99.67%`, lines `98.82%`)
  - `npm run build`
  - `npm run e2e` (`8 passed`)
  - `npm run smoke:production`
  - `npm audit --audit-level=moderate` (`found 0 vulnerabilities`)
- Follow-up provider checks still needed before full paid launch sign-off: one live report email send with a safe recipient/domain, and one Stripe test-mode Checkout/Customer Portal pass.

Current go-live hardening implementation status on 2026-06-17:

- Added assertion engine coverage for `valid_json`, `contains_text`, `matches_regex`, and `field_not_empty`.
- Added synthetic test-pack helper coverage for the extended assertion builder fields.
- Added report PDF attachment helper coverage so sent report emails include the generated PDF.
- Added DB-backed rate-limit helper coverage and route coverage for public run-log and scheduler throttling.
- Full verification for this hardening pass should include `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, production smoke, and a provider-side Stripe Checkout/Portal pass after migrations and env vars are deployed.

Current core-loop production audit status on 2026-06-17:

- Added URL preservation and DNS-aware SSRF unit coverage.
- Added HTTP runner coverage for one retry after transport/read failures and degraded status classification for non-status assertion misses.
- Extended core E2E coverage for issue report inclusion, source-check rerun, assignment, resolution note, and resolved issue reporting.
- Final verification passed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` (`56 passed`, `306 passed`)
  - `npm run build`
  - `npm run e2e` (`8 passed`)

## Critical test areas

### Assertion engine

Test:

- field exists
- field not empty
- field equals
- contains text
- not contains
- matches regex
- valid JSON
- status code expected
- latency under threshold
- JSON parse failure
- missing response body

### Check runner

Test:

- healthy result
- degraded latency result
- failed status code result
- timeout result
- network error result
- assertion failure result

### Issue dedupe

Test:

- repeated same failure updates existing open issue
- new failure type creates new issue
- resolved issue can reopen or create new issue based on rules

### Report aggregation

Test:

- counts checks correctly
- counts issues correctly
- excludes non-reportable issues
- includes resolved issue summaries
- respects period boundaries

### Security

Test:

- user cannot access another agency's client
- user cannot access another agency's workflow
- secrets not returned in API responses
- report does not include raw secret-bearing data

## Required scripts

Add these scripts if missing:

```json
{
  "scripts": {
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run src",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```
