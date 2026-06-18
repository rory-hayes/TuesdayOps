# TuesdayOps Check Execution Audit

Date: 2026-06-18

Scope: Core Blocker 2 - Check Execution Reliability for the core loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No general observability, full eval suite, workflow-builder, client-portal, CRM, billing, or synthetic platform expansion was added.

## Inspected Files

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ACCEPTANCE_CRITERIA.md`, `SECURITY.md`, `TESTING.md`, `TASKS.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.
- Check execution services: `src/lib/checks/runner.ts`, `src/lib/checks/assertions.ts`, `src/lib/checks/config.ts`, `src/lib/checks/execution.ts`, `src/lib/checks/service.ts`, `src/lib/checks/scheduled-runner.ts`, and `src/lib/checks/scheduler.ts`.
- Workflow/check surfaces: `src/components/workflows/workflow-detail-page.tsx`, `src/components/workflows/workflows-page.tsx`, `src/components/checks/checks-page.tsx`, and `src/lib/workflows/service.ts`.
- Safety and secrets utilities: `src/lib/security/endpoint-url.ts`, `src/lib/security/endpoint-url-server.ts`, `src/lib/security/secrets.ts`, and `src/lib/security/rate-limit.ts`.
- Focused tests: runner, assertion, config, execution persistence, endpoint URL safety, workflow service/UI-adjacent lifecycle tests, scheduled runner/scheduler tests, and existing workflow/check E2E coverage.

## Issues Found

- Runner auth headers were built solely from decrypted auth config. If stale encrypted auth material ever remained inconsistent with the workflow's persisted `auth_type`, a manual or scheduled check could send an auth header even after the workflow was marked `auth_type = none` or changed to another auth mode.
- Manual run feedback redirected to a generic success banner even when the persisted run status was `healthy`, `degraded`, or `failed`, so the immediate UI feedback was less specific than the stored run history.

## Confirmed Existing Coverage And Behavior

- Endpoint URLs are preserved exactly after trim-only validation and are revalidated before execution.
- Runner honors method, request body, bearer/API key/basic auth, timeout signal, expected status, max latency, bounded response reads, redirect blocking, one conservative retry, response summaries, and simple assertions.
- Status classification is `healthy` when all assertions pass, `degraded` for latency/content/assertion misses, and `failed` for status-code/request hard failures.
- Check-run persistence stores status, latency, HTTP status code, assertion results, error/reason, trigger metadata, and timestamps.
- Raw response bodies are not stored by default; response summaries are length-capped and redact common sensitive values.
- Manual run controls exist on workflow detail header, workflow Checks tab, global Workflows table, global Checks page, and issue rerun actions.

## Fixes Made

- Scoped outgoing auth headers to the workflow's persisted `auth_type`; mismatched decrypted auth config is ignored instead of sent.
- Added status-specific manual check run notices:
  - `healthy`: passed and history updated.
  - `degraded`: degraded with guidance to review assertions/history.
  - `failed`: failed with issue tracking/history updated.
  - `skipped`: skipped with history updated.
- Updated E2E onboarding helpers to wait for controlled agency name/slug inputs to retain their values before submitting, preventing hydration races in the QA suite.
- Updated drilldown E2E feedback expectations for failed manual check runs to match the new status-specific banner.

## Tests Added

- `src/lib/checks/runner.test.ts`: added coverage that stale/mismatched decrypted auth config does not produce outgoing auth headers.
- `src/lib/checks/lifecycle.test.ts`: added coverage for status-specific manual check run feedback.
- E2E specs: stabilized workspace creation in all specs that use the controlled onboarding form and updated the drilldown manual-run feedback assertion.

## Commands Run

```bash
npm ci
npm install
npm install --no-save @rolldown/binding-darwin-arm64@1.0.3
npm run test -- src/lib/checks/runner.test.ts src/lib/checks/lifecycle.test.ts
npx vitest run src/lib/checks/runner.test.ts src/lib/checks/assertions.test.ts src/lib/checks/execution.test.ts src/lib/checks/config.test.ts src/lib/security/endpoint-url.test.ts src/lib/security/endpoint-url-server.test.ts
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run lint
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run typecheck
PATH="/opt/homebrew/opt/node/bin:$PATH" npx vitest run src/lib/checks/runner.test.ts src/lib/checks/assertions.test.ts src/lib/checks/execution.test.ts src/lib/checks/config.test.ts src/lib/security/endpoint-url.test.ts src/lib/security/endpoint-url-server.test.ts
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run test
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run build
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run e2e
PATH="/opt/homebrew/opt/node/bin:$PATH" NEXT_PUBLIC_APP_URL="http://localhost:3100" npm run dev -- --port 3100
PATH="/opt/homebrew/opt/node/bin:$PATH" NEXT_PUBLIC_APP_URL="http://localhost:3100" PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test e2e/drilldowns-feedback.spec.ts e2e/scheduled-checks.spec.ts
PATH="/opt/homebrew/opt/node/bin:$PATH" NEXT_PUBLIC_APP_URL="http://localhost:3100" PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test e2e/workflow-onboarding.spec.ts
PATH="/opt/homebrew/opt/node/bin:$PATH" NEXT_PUBLIC_APP_URL="http://localhost:3100" PLAYWRIGHT_SKIP_WEBSERVER=true npm run e2e
git fetch origin main
git merge --no-edit origin/main
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run lint
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run typecheck
PATH="/opt/homebrew/opt/node/bin:$PATH" npx vitest run src/lib/checks/runner.test.ts src/lib/checks/assertions.test.ts src/lib/checks/execution.test.ts src/lib/checks/config.test.ts src/lib/security/endpoint-url.test.ts src/lib/security/endpoint-url-server.test.ts
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run test
PATH="/opt/homebrew/opt/node/bin:$PATH" npm run build
PATH="/opt/homebrew/opt/node/bin:$PATH" NEXT_PUBLIC_APP_URL="http://localhost:3100" PLAYWRIGHT_SKIP_WEBSERVER=true npm run e2e
```

Results so far:

- Initial `npm run test -- src/lib/checks/runner.test.ts src/lib/checks/lifecycle.test.ts` could not start because dependencies were missing.
- `npm ci` installed dependencies but warned that the default shell Node was `20.18.0`, below the repo floor `>=20.19.0`.
- Vitest initially could not start because npm did not install the optional Rolldown Darwin ARM binding; installed the lockfile-listed binding locally with `--no-save`.
- Red tests failed as expected for stale auth header leakage and missing status-specific feedback helper.
- After fixes, `npm run test -- src/lib/checks/runner.test.ts src/lib/checks/lifecycle.test.ts` passed all `src` tests via the project script: 57 files, 312 tests.
- Explicit focused Vitest check suite passed: 6 files, 46 tests.
- Verified with repo-compliant Node `25.6.1` from `/opt/homebrew/opt/node/bin`.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Focused check/assertion/persistence/URL suite: passed, 6 files and 46 tests.
- `npm run test`: passed, 57 files and 312 tests.
- `npm run build`: passed.
- Initial `npm run e2e` was blocked before tests ran because the worktree was missing `.env.local`.
- Copied the ignored QA `.env.local` from `/Users/rory/Documents/TuesdayOps/.env.local` without printing values or committing it.
- Local Supabase/Docker startup was attempted but hung during database/schema initialization, so the QA env path was used instead.
- Running the dev server through Playwright's default web server still timed out. Starting Next manually on port `3100` and using `PLAYWRIGHT_SKIP_WEBSERVER=true` worked.
- Running against `127.0.0.1:3100` caused Next dev to block cross-origin dev resources, which prevented client hydration and left client-only buttons disabled. Re-running against `localhost:3100` fixed hydration.
- Focused E2E after fixes passed:
  - `e2e/drilldowns-feedback.spec.ts`
  - `e2e/scheduled-checks.spec.ts`
  - `e2e/workflow-onboarding.spec.ts`
- Full E2E passed: 8 files, 8 tests.
- Pulled latest `origin/main`, resolved conflicts in `CHANGELOG.md`, `e2e/reports.spec.ts`, and check lifecycle/service helpers while preserving upstream rate-limit/validation work and this branch's status-specific run feedback.
- Post-merge verification passed:
  - `npm run lint`
  - `npm run typecheck`
  - focused check/assertion/persistence/URL suite: 6 files, 49 tests
  - `npm run test`: 62 files, 353 tests
  - `npm run build`
  - `npm run e2e`: 8 files, 8 tests

## Remaining Verification

- Merge verified branch into local `main`.

## Remaining Gaps

- No known product gap remains in this pass for check execution reliability.
- Provider-side live behavior still depends on production Supabase Cron/Vault, Resend, and Stripe configuration as documented in the core-loop audit.
