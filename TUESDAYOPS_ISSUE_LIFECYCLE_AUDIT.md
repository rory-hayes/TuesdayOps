# TuesdayOps Issue Lifecycle Audit

Date: 2026-06-18

Scope: Core Blocker 4 - Issue Lifecycle and Maintenance Inbox.

Focused loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No project management, kanban, CRM, client portal, advanced permissions, eval studio, or general observability scope was added.

## Inspected Files

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ACCEPTANCE_CRITERIA.md`, `REPORTING_SPEC.md`, `TESTING.md`, `TASKS.md`, `SECURITY.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.
- Issue engine/service/UI: `src/lib/issues/engine.ts`, `src/lib/issues/operations.ts`, `src/lib/issues/service.ts`, `src/components/issues/issues-page.tsx`, `src/components/issues/issue-detail-page.tsx`, `src/app/(app)/issues/page.tsx`, and `src/app/(app)/issues/[issueId]/page.tsx`.
- Issue tests and related flows: `src/lib/issues/engine.test.ts`, `src/lib/issues/operations.test.ts`, `src/lib/test-packs/issues.ts`, `src/lib/test-packs/issues.test.ts`, and `e2e/drilldowns-feedback.spec.ts`.
- Report/data paths: `src/lib/data/operational-data.ts`, `src/lib/data/operational-data.test.ts`, `src/lib/reports/aggregation.ts`, and `src/lib/reports/aggregation.test.ts`.
- Audit/schema paths: `src/lib/audit/events.ts` and Supabase issue/audit migrations.

## Issues Found

- The inbox supported resolution notes but did not support an independent issue maintenance note for in-progress work.
- Report-inclusion toggles were tenant-scoped but were not audited, unlike assign/resolve/ignore/snooze.
- Assigning, resolving, or ignoring a snoozed issue left `snoozed_until` behind, which could display stale snooze state after the issue had moved to another lifecycle state.
- Existing tests covered issue engine and operations, but server-action coverage for assign, note, rerun, resolve, ignore, snooze, and reportable toggle was missing.
- Report aggregation tests did not explicitly prove non-reportable issues are excluded while detected/resolved timestamps drive caught/resolved counts.

## Fixes Made

- Added `issues.maintenance_note` with a tenant-scoped `updateIssueNoteAction`.
- Added maintenance-note forms and displays to the issue queue details and issue detail page.
- Added audit events for `issue.noted` and `issue.reportable_updated`.
- Cleared `snoozed_until` when assigning, resolving, or ignoring an issue.
- Kept report aggregation focused on report-safe resolution notes; maintenance notes remain internal inbox context and are not included in reports.
- Updated docs for the new issue note field, audit actions, and inbox behavior.

## Tests Added

- Added `src/lib/issues/service.test.ts` covering assign, maintenance note, source-check rerun, resolve, snooze, ignore, and reportable toggle actions.
- Added operational-data coverage proving expired snoozed issues reappear as open in the maintenance inbox and maintenance notes map correctly.
- Added report aggregation coverage proving reportable state, detected timestamps, and resolved timestamps control issue caught/resolved report counts.
- Extended the core-loop E2E happy path to save and display a maintenance note before resolution/report generation.

## Commands Run

- `npm ci` - completed with Node engine warnings because the shell uses Node `20.18.0` while the repo requires `>=20.19.0`.
- `npm install` - completed with the same Node engine warnings.
- `npm install --no-save @rolldown/binding-darwin-arm64@1.0.3` - repaired npm optional dependency installation for local Vitest startup.
- `npx vitest run src/lib/issues/service.test.ts` - first reached the intended red state, then passed after fixes.
- `npx vitest run src/lib/issues/engine.test.ts src/lib/issues/operations.test.ts src/lib/issues/service.test.ts src/lib/data/operational-data.test.ts src/lib/reports/aggregation.test.ts src/lib/test-packs/issues.test.ts` - passed, 6 files and 37 tests.
- `npm run typecheck` - failed once on a test stub cast, then passed after the cast fix.
- `npm run lint` - passed.
- `npm run test` - passed, 58 files and 319 tests.
- `npm run build` - passed.
- `npx supabase db push` - blocked because this worktree is not linked to a Supabase project.
- `npm run e2e -- e2e/drilldowns-feedback.spec.ts` - blocked before tests started because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are not configured in this worktree.
- `npm run e2e` - blocked for the same missing Supabase environment.
- `git diff --check` - passed.

## Remaining Gaps

- The new Supabase migration still needs to be applied in the target environment because this worktree is not linked to a Supabase project.
- E2E could not run in this worktree until Supabase env vars are supplied.
- Live provider validation for Resend/Stripe remains outside this issue-lifecycle pass.
