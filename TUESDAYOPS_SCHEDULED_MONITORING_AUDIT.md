# TuesdayOps Scheduled Monitoring Audit

Date: 2026-06-18

Scope: Core Blocker 3 - Scheduled Monitoring and Job Visibility for the core loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No general observability platform, eval suite, workflow builder, client portal, CRM, billing expansion, or new job provider scope was added.

## Inspected Files

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, `SECURITY.md`, `TESTING.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.
- Scheduler route and tests: `src/app/api/scheduler/run-due-checks/route.ts`, `src/app/api/scheduler/run-due-checks/route.test.ts`, and `e2e/scheduled-checks.spec.ts`.
- Scheduler/check services and tests: `src/lib/checks/scheduler.ts`, `src/lib/checks/scheduler.test.ts`, `src/lib/checks/scheduled-runner.ts`, `src/lib/checks/scheduled-runner.test.ts`, `src/lib/checks/execution.ts`, `src/lib/checks/execution.test.ts`, `src/lib/checks/runner.ts`, and related runner/security tests.
- Issue creation services and tests: `src/lib/issues/engine.ts`, `src/lib/issues/operations.ts`, `src/lib/issues/engine.test.ts`, and `src/lib/issues/operations.test.ts`.
- Scheduler/cron migrations: `supabase/migrations/20260613153450_scheduled_check_runs.sql`, `supabase/migrations/20260614153057_supabase_cron_scheduler.sql`, `supabase/migrations/20260614154602_supabase_cron_timeout.sql`, `supabase/migrations/20260617192044_persistent_rate_limits.sql`, and `supabase/migrations/20260617195500_core_loop_production_blockers.sql`.

## Issues Found

- One scheduler route invocation asked the database due selector for only one page of work. The selector itself was database-side and ordered fairly, but the app did not continue paging, so a large due backlog could require many cron invocations and make job visibility less useful.
- The scheduled runner relied on the unique scheduled-window insert to dedupe after the outbound workflow request had already run. Immediate overlapping invocations avoided duplicate persisted runs, but still performed unnecessary workflow calls where an existing scheduled run was already present.
- The route response already exposed attempted/completed/skipped/failed counts, and scheduled batch failures were already logged with redaction, but there was no route-level regression test proving non-zero failure counts remain visible.

## Fixes Made

- Updated `runDueScheduledChecks()` to drain due checks in database-selected pages instead of stopping after the first loaded page.
- Added an attempted-check exclusion list to each follow-up `get_due_health_checks()` call so a check that remains due after a failed attempt cannot hide later due checks in the same sweep.
- Added a Supabase migration extending `public.get_due_health_checks()` with `p_exclude_check_ids uuid[]`.
- Dropped the previous three-argument `get_due_health_checks()` overload in the migration so the service-role RPC uses one current selector signature.
- Added a scheduled-window preflight in `executeCheckRun()` that skips before decrypting credentials or calling the workflow endpoint when the same `(agency_id, check_id, scheduled_for)` run already exists.
- Kept the database unique index as the final idempotency backstop for races where two invocations start before either has inserted a run.
- Added route-level coverage that non-zero scheduler failure counts are returned to operators.

## Tests Added

- `src/lib/checks/scheduled-runner.test.ts`
  - High-volume due-selection coverage for 120 due checks drained across database-selected pages.
  - Regression coverage that already-attempted due checks are excluded from later pages.
- `src/lib/checks/execution.test.ts`
  - Duplicate scheduled windows skip before the workflow endpoint is called.
  - Degraded scheduled runs create/update issues and update workflow health through the shared execution path.
- `src/app/api/scheduler/run-due-checks/route.test.ts`
  - Scheduler route returns attempted/completed/skipped/failed counts including non-zero failures.

Existing coverage still protects scheduler auth, pre-auth and persistent scheduler rate limits, redacted scheduled failure logging, issue dedupe/update behavior, SSRF protections, timeout, response cap, and check-run persistence.

## Commands Run

- `npm install`
  - Installed local dependencies. npm warned that the local shell is Node `20.18.0` while the repo requires `>=20.19.0`.
- `npm install --include=optional`
  - Retried optional dependency installation after Vitest reported a missing native Rolldown binding.
- `npm install --no-save @rolldown/binding-darwin-arm64@1.0.3`
  - Repaired the local optional native binding without adding application dependencies.
- `npx vitest run src/lib/checks/scheduled-runner.test.ts src/lib/checks/execution.test.ts`
  - First meaningful red run failed on the new paging and duplicate-preflight expectations.
  - After implementation, passed: 2 files, 21 tests.
- `npx vitest run src/lib/checks/scheduled-runner.test.ts src/lib/checks/execution.test.ts src/app/api/scheduler/run-due-checks/route.test.ts`
  - Passed: 3 files, 27 tests.
- `npx vitest run src/lib/checks/scheduler.test.ts src/lib/checks/scheduled-runner.test.ts src/lib/checks/execution.test.ts src/lib/checks/runner.test.ts src/lib/issues/engine.test.ts src/lib/issues/operations.test.ts src/app/api/scheduler/run-due-checks/route.test.ts`
  - Passed: 7 files, 59 tests.
- `npm run lint`
  - Passed with exit code 0.
- `npm run typecheck`
  - Passed with exit code 0.
- `npm run test`
  - Passed: 57 files, 315 tests.
- `npm run build`
  - Passed with exit code 0.
- `npm run e2e -- e2e/scheduled-checks.spec.ts`
  - Did not start because port `3000` was already in use.
- `PLAYWRIGHT_SKIP_WEBSERVER=true NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run e2e -- e2e/scheduled-checks.spec.ts`
  - Ran against the existing local server; skipped 1 test because the scheduled-check E2E requires Supabase service credentials and `SCHEDULER_SECRET` in the shell.
- `git diff --check`
  - Passed with exit code 0.
- `git fetch origin main` and `git merge origin/main`
  - Pulled latest `main` into the scheduled-monitoring branch.
  - Resolved conflicts in `ARCHITECTURE.md`, `CHANGELOG.md`, `src/lib/checks/scheduled-runner.ts`, and `src/lib/checks/scheduled-runner.test.ts`.
  - Preserved main's per-agency scheduled execution rate-limit bucket and combined it with the paged due-check sweep.
- Post-merge `npm run lint`
  - Passed with exit code 0.
- Post-merge `npm run typecheck`
  - Passed with exit code 0.
- Post-merge `npx vitest run src/lib/checks/scheduler.test.ts src/lib/checks/scheduled-runner.test.ts src/lib/checks/execution.test.ts src/lib/checks/runner.test.ts src/lib/issues/engine.test.ts src/lib/issues/operations.test.ts src/app/api/scheduler/run-due-checks/route.test.ts src/lib/checks/rate-limits.test.ts`
  - Passed: 8 files, 62 tests.
- Post-merge `npm run test`
  - Passed: 60 files, 330 tests.
- Post-merge `npm run build`
  - Passed with exit code 0.
- Post-merge `PLAYWRIGHT_SKIP_WEBSERVER=true NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run e2e -- e2e/scheduled-checks.spec.ts`
  - Ran against the existing local server; skipped 1 test because the scheduled-check E2E requires Supabase service credentials and `SCHEDULER_SECRET` in the shell.

## Remaining Gaps

- Supabase Cron timing in production still depends on deployed Vault secrets and Cron configuration. This pass verifies the protected route and shared scheduled runner behavior in code.
- The scheduled-check Playwright E2E could not execute in this shell because the required Supabase service credentials and `SCHEDULER_SECRET` were not available to the spec. The attempt and skip are recorded above.
