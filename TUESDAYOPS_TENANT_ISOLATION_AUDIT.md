# TuesdayOps Tenant Isolation Audit

Date: 2026-06-18

Scope: Core Blocker 6 - tenant isolation and data boundary hardening for the MVP loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No advanced roles, client portal, CRM, eval platform, or provider scope was added.

## Inspected Files And Policies

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, `SECURITY.md`, `TESTING.md`, `TUESDAYOPS_CORE_LOOP_AUDIT.md`, and `CHANGELOG.md`.
- Supabase migrations:
  - `20260613111357_milestones_1_3.sql`
  - `20260613162243_test_packs.sql`
  - `20260613165022_reports.sql`
  - `20260614130339_code_hardening_foundation.sql`
  - `20260616193000_design_partner_readiness_lifecycle.sql`
  - `20260617192044_persistent_rate_limits.sql`
  - `20260617195500_core_loop_production_blockers.sql`
- Tenant-owned RLS policies for `clients`, `workflows`, `checks`, `check_runs`, `issues`, `test_packs`, `test_cases`, `test_runs`, `reports`, `report_items`, `workflow_api_keys`, and `audit_events`.
- Service/API surfaces:
  - `src/lib/data/operational-data.ts`
  - `src/lib/checks/execution.ts`
  - `src/lib/checks/scheduled-runner.ts`
  - `src/lib/issues/operations.ts`
  - `src/lib/issues/service.ts`
  - `src/lib/reports/service.ts`
  - `src/app/(app)/reports/[reportId]/page.tsx`
  - `src/app/api/reports/[reportId]/download/route.ts`
  - `src/lib/run-logs/service.ts`
  - `src/app/api/public/run-log/route.ts`

## Issues Found

- `issues.check_run_id` used a plain foreign key to `check_runs(id)`. Other core-loop child records used composite tenant foreign keys with `agency_id`, but this nullable health-run link could point at another tenant's check run if service-role code or future code supplied a mismatched UUID.

## Fixes Made

- Added `supabase/migrations/20260618120000_tenant_issue_check_run_boundary.sql`.
- The migration clears any legacy mismatched issue check-run references, drops the old plain FK, and adds `issues_check_run_agency_fk` on `(check_run_id, agency_id) -> check_runs(id, agency_id)`.
- The new FK preserves check-run retention by setting only nullable `check_run_id` to null when old check runs are deleted.
- Added migration contract coverage proving RLS is enabled and core-loop child references use tenant-composite keys.
- Added report download route coverage proving a cross-tenant report id returns `404` before report-quality loading or service-role storage download.
- Added public run-log service coverage proving an API key cannot write to a payload workflow id outside the key's bound workflow.
- Added operational data loader coverage proving all core-loop page data sets are filtered by the active agency id.
- Updated `DATA_MODEL.md`, `SECURITY.md`, and `CHANGELOG.md`.

## Tests Added

- `src/lib/security/tenant-isolation-migrations.test.ts`
- `src/app/api/reports/[reportId]/download/route.test.ts`
- `src/lib/run-logs/service.test.ts`
- `src/lib/data/operational-data.test.ts`

## Commands Run

Passing so far:

```bash
npx vitest run src/lib/security/tenant-isolation-migrations.test.ts
npx vitest run src/lib/security/tenant-isolation-migrations.test.ts 'src/app/api/reports/[reportId]/download/route.test.ts' src/lib/run-logs/service.test.ts
npx vitest run src/lib/data/operational-data.test.ts src/lib/security/tenant-isolation-migrations.test.ts 'src/app/api/reports/[reportId]/download/route.test.ts' src/lib/run-logs/service.test.ts
PATH=/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run lint
PATH=/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run typecheck
PATH=/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx vitest run src/lib/data/operational-data.test.ts src/lib/security/tenant-isolation-migrations.test.ts 'src/app/api/reports/[reportId]/download/route.test.ts' src/lib/run-logs/service.test.ts src/lib/checks/execution.test.ts src/lib/issues/operations.test.ts
PATH=/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run test
PATH=/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run build
PATH=/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run e2e -- e2e/reports.spec.ts
```

Results:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Focused tenant/security/report/API tests: passed, 6 files and 32 tests.
- `npm run test`: passed, 58 files and 316 tests.
- `npm run build`: passed.
- `npm run e2e -- e2e/reports.spec.ts`: attempted. One earlier run completed with the single report E2E test skipped by existing environment gating. The post-merge rerun failed at web-server startup because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are not configured in this shell.
- `git diff --check`: passed.

Expected red before the fix:

```bash
npx vitest run src/lib/security/tenant-isolation-migrations.test.ts
```

The failing assertion was the missing `issues_check_run_agency_fk` composite tenant constraint.

Tooling note: this shell initially used Node `20.18.0`, below the repo floor of `>=20.19.0`, and npm missed Rolldown's optional native binding. The binding was repaired locally for verification; package metadata was not changed.

## Remaining Gaps

- E2E should be run against a configured local/remote Supabase test environment before release if report/auth access behavior changes beyond this route-level hardening. This pass changed the report download test coverage and database constraint, not UI flow behavior, and local report E2E could not complete without Supabase public env vars.
- The new Supabase migration still needs to be applied to the target database before production traffic relies on the strengthened issue-to-check-run constraint.
