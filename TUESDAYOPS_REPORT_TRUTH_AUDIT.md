# TuesdayOps Report Truth Audit

Date: 2026-06-18

Scope: Core Blocker 1 - Report Truth and Reproducibility for the core loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No CRM, client portal, billing expansion, trace explorer, full eval platform, marketplace, native integration, custom domain, SSO, or unrelated product scope was added.

## Inspected Files

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `TASKS.md`, `DATA_MODEL.md`, `ACCEPTANCE_CRITERIA.md`, `REPORTING_SPEC.md`, `TESTING.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.
- Report services and helpers: `src/lib/reports/aggregation.ts`, `src/lib/reports/service.ts`, `src/lib/reports/pdf.ts`, `src/lib/reports/quality.ts`, `src/lib/reports/scheduler.ts`, `src/lib/reports/sanitize.ts`, and `src/lib/data/operational-data.ts`.
- Report routes and UI: `src/app/(app)/reports/page.tsx`, `src/app/(app)/reports/[reportId]/page.tsx`, `src/app/api/reports/[reportId]/download/route.ts`, `src/components/reports/reports-page.tsx`, and `src/components/reports/report-detail-page.tsx`.
- Report tests: `src/lib/reports/aggregation.test.ts`, `src/lib/reports/pdf.test.ts`, `src/lib/reports/quality.test.ts`, `src/lib/reports/scheduler.test.ts`, `src/lib/data/operational-data.test.ts`, `src/app/api/reports/[reportId]/download/route.test.ts`, and `e2e/reports.spec.ts`.

## Issues Found

- Report aggregation counted selected-client, selected-period check runs and issues without applying the report-included workflow boundary. A workflow marked `included_in_reports = false` could still inflate `checksRun`, lower `passRate`, increase `issuesCaught`, and leak issue titles into recommendations.
- PDF generation rendered only the first four report modules while generated report records store five core modules. The web preview could include model/prompt change evidence that the PDF/export omitted.
- Report E2E was flaky in this worktree because the second onboarding form could be filled before the client component hydrated; hydration then reset the controlled inputs before the server action read `FormData`.

## Fixes Made

- Updated `buildReportDraft()` so check runs and reportable issues must belong to the selected client's report-included workflow set before they affect metrics, issue sections, recommendations, or pass-rate math.
- Updated PDF rendering to include all five stored core report modules: workflow health, issues caught, issues resolved, QA checks, and model/prompt changes.
- Hardened the report E2E onboarding helper to wait for hydration/network idle, assert the filled agency name/slug values, and use a longer onboarding navigation wait.
- Updated `REPORTING_SPEC.md` to document the report-included workflow boundary and preview/PDF module consistency requirement.
- Updated `CHANGELOG.md` with the report truth fixes.

## Tests Added

- Added a regression test proving excluded workflows do not affect report check totals, issue counts, pass-rate math, or recommendations.
- Added a PDF smoke/unit test proving every stored core report module is rendered in the PDF artifact.
- Updated report E2E coverage to avoid submitting an empty onboarding form during cross-tenant report download verification.

## Verification Commands

- Dependency/runtime setup:
  - Initial `npm install` under `/Users/rory/.local/bin/node` warned that Node `20.18.0` does not satisfy the repo engine `>=20.19.0`; switched to `/opt/homebrew/bin/node` `25.6.1`.
  - `PATH=/opt/homebrew/bin:$PATH npm install` completed with `found 0 vulnerabilities`.
- `PATH=/opt/homebrew/bin:$PATH npm run test -- src/lib/reports/aggregation.test.ts`
  - Red: failed as expected before the aggregation fix because excluded workflow data changed `checksRun`, `issuesCaught`, and `passRate`.
  - Green: passed after the fix; due to the package script this ran the full `src` Vitest target plus the focused file, with 57 files and 311 tests passing.
- `PATH=/opt/homebrew/bin:$PATH npx vitest run src/lib/reports/pdf.test.ts`
  - Red: failed as expected before the PDF fix because `Model and prompt changes` was absent from the PDF bytes.
- `PATH=/opt/homebrew/bin:$PATH npx vitest run src/lib/reports/aggregation.test.ts src/lib/reports/pdf.test.ts`
  - Green: 2 files and 18 tests passed.
- `PATH=/opt/homebrew/bin:$PATH npm run lint`
  - Passed.
- `PATH=/opt/homebrew/bin:$PATH npm run typecheck`
  - Passed.
- `PATH=/opt/homebrew/bin:$PATH npx vitest run src/lib/reports/aggregation.test.ts src/lib/reports/pdf.test.ts 'src/app/api/reports/[reportId]/download/route.test.ts'`
  - Passed: 3 files and 23 tests.
- `PATH=/opt/homebrew/bin:$PATH npm run test`
  - Passed: 57 files and 312 tests.
- `PATH=/opt/homebrew/bin:$PATH npm run build`
  - Passed.
- `PATH=/opt/homebrew/bin:$PATH npm run e2e -- e2e/reports.spec.ts`
  - Blocked before tests ran. The local web server could not boot because required Supabase public env vars are absent: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Playwright exited with `Timed out waiting 30000ms from config.webServer`.
- Copied the existing ignored provider config from `/Users/rory/Documents/TuesdayOps/.env.local` into this worktree's ignored `.env.local`.
- `PATH=/opt/homebrew/bin:$PATH NEXT_PUBLIC_APP_URL=http://localhost:3002 PLAYWRIGHT_SKIP_WEBSERVER=true npm run e2e -- e2e/reports.spec.ts`
  - First run after env setup reached the app but failed during cold dev-server route/action compilation.
  - Second run exposed the onboarding hydration race described above.
  - Passed after the E2E helper fix: 1 Playwright test passed.
- Final pre-merge verification:
  - `PATH=/opt/homebrew/bin:$PATH npm run lint`: passed.
  - `PATH=/opt/homebrew/bin:$PATH npm run typecheck`: passed.
  - `PATH=/opt/homebrew/bin:$PATH npx vitest run src/lib/reports/aggregation.test.ts src/lib/reports/pdf.test.ts 'src/app/api/reports/[reportId]/download/route.test.ts'`: passed, 3 files and 23 tests.
  - `PATH=/opt/homebrew/bin:$PATH npm run test`: passed, 57 files and 312 tests.
  - `PATH=/opt/homebrew/bin:$PATH npm run build`: passed.
  - `PATH=/opt/homebrew/bin:$PATH NEXT_PUBLIC_APP_URL=http://localhost:3002 PLAYWRIGHT_SKIP_WEBSERVER=true npm run e2e -- e2e/reports.spec.ts`: passed, 1 Playwright test.

## Remaining Gaps

- Live provider verification for Resend delivery, Stripe, and production Supabase Cron remains outside this local code audit unless configured with safe provider credentials.
