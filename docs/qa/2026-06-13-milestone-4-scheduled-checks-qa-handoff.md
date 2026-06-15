# Milestone 4 Scheduled Checks QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-4-scheduled-checks`

Current status: superseded. Production scheduling later moved from Inngest to
Supabase Cron/Vault calling the protected scheduler route.

## Scope

This handoff covers T4.1 Background job setup:

- Inngest background job wiring, later replaced by Supabase Cron/Vault.
- Scheduled health-check execution.
- Retry behavior on the per-check scheduled job.
- Scheduled run persistence and duplicate-window protection.
- QA trigger route for scheduled runner smoke tests.

The product loop under test is:

```txt
Agency -> Client -> Workflow -> Check -> Scheduled Check Run -> Issue
```

## Implementation Summary

- Historical implementation added Inngest app client and functions:
  - `scheduled-check-sweep`: cron every five minutes.
  - `run-scheduled-check`: one check execution per event, with `retries: 3`.
- Historical implementation added `/api/inngest`; the active production path now uses Supabase Cron/Vault.
- Added protected `/api/scheduler/run-due-checks` route for QA and operational smoke testing.
- Added server-only Supabase admin client using `SUPABASE_SECRET_KEY`.
- Added `SCHEDULER_SECRET` authorization for the scheduler trigger route.
- Moved check execution into a shared service used by manual and scheduled runs.
- Moved issue persistence out of the server-action module so background jobs can use it safely.
- Added scheduled check selection and batch runner services.
- Added `trigger` and `scheduled_for` columns to `check_runs`.
- Added a unique scheduled-window index on `(agency_id, check_id, scheduled_for)` for scheduled runs.
- Added reusable Playwright E2E coverage.

## Database Changes

Migration applied to the linked remote Supabase project:

```txt
20260613153450_scheduled_check_runs.sql
```

New `check_runs` fields:

- `trigger text not null default 'manual'`
- `scheduled_for timestamptz`

New idempotency index:

```sql
create unique index check_runs_scheduled_window_unique_idx
on public.check_runs(agency_id, check_id, scheduled_for)
where trigger = 'scheduled' and scheduled_for is not null;
```

## Verification Evidence

### Static Checks

All passed locally after implementation:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Unit coverage now includes:

- scheduler due-window selection
- scheduled batch execution summary behavior
- scheduled run persistence helpers
- assertion engine
- issue engine

### Supabase Verification

Passed:

```bash
supabase db push --dry-run --linked
supabase db push --linked --yes
supabase migration list --linked
supabase db lint --linked --fail-on error
```

Remote migration history includes:

```txt
20260613111357
20260613144638
20260613153450
```

Supabase DB lint result:

```txt
No schema errors found
```

### E2E Verification

Passed:

```bash
npm run e2e -- e2e/scheduled-checks.spec.ts
```

Result:

```txt
1 passed (6.2s)
```

Manual one-off Playwright flow also passed and captured screenshots:

- workflow detail showed `failed`, pass rate `0%`, one scheduled health check, and last check timing
- issues page showed one open medium issue created from the scheduled run

Observed scheduled run row:

```json
{
  "status": "failed",
  "status_code": 404,
  "trigger": "scheduled",
  "scheduled_for": "2026-06-13T15:50:00+00:00"
}
```

Observed issue row:

```json
{
  "status": "open",
  "severity": "medium",
  "occurrence_count": 1,
  "title": "Scheduled Failing Workflow 1781365869580 returned HTTP 404"
}
```

Scheduler route access control passed:

- authorized trigger returned `200`
- missing scheduler secret returned `401`

Duplicate protection passed:

- first scheduler trigger created one scheduled run for the test workflow
- second immediate scheduler trigger created no duplicate scheduled run

## Browser QA

Browser plugin path:

- sign-in page opened at `http://localhost:3000/sign-in`
- title was `TuesdayOps`
- DOM snapshot contained the sign-in form
- console warnings/errors were empty

Browser screenshot capture timed out twice through the in-app browser:

```txt
Timed out running CDP command "Page.captureScreenshot"
```

Fallback:

- standard Playwright was used for full E2E
- Playwright captured workflow and issues screenshots successfully

## Environment State

Local `.env.local` was updated with server-only values without printing secrets:

- `SUPABASE_SECRET_KEY`
- `SCHEDULER_SECRET`

Vercel production env was updated with:

- `SUPABASE_SECRET_KEY`
- `SCHEDULER_SECRET`

Preview branch-scoped env setup was attempted before the branch existed on GitHub, and Vercel rejected it with:

```txt
Branch "codex/milestone-4-scheduled-checks" not found in the connected Git repository.
```

Retry branch-scoped preview env setup after pushing the branch if preview E2E is required.

## Known Residual Risks

- Superseded risk: the original Inngest cloud scheduling path was removed after this handoff. The active production path uses Supabase Cron/Vault to call `/api/scheduler/run-due-checks`.
- `npm audit` reports advisories that currently require breaking force upgrades:
  - production moderate PostCSS advisory through `next`/`inngest`; current `next@16.2.9` is the latest published version
  - dev high esbuild/Vite advisory; upgrading the Vite/plugin chain is a separate production-readiness task because the current local Node is `20.18.0` while several packages already require `>=20.19.0`
- Supabase CLI is `2.75.0`; latest available during testing was `2.106.0`. Commands used here were checked with `--help` before execution.
- Scheduled jobs currently run due checks sequentially inside the protected scheduler route.

## QA Recommendation

QA should rerun:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e -- e2e/scheduled-checks.spec.ts
```

Then verify in Supabase:

- scheduled runs have `trigger = scheduled`
- scheduled runs have a populated `scheduled_for`
- repeated scheduler calls do not create duplicate rows for the same scheduled window
- failed scheduled runs create or update one active issue per material failure

Before promoting this milestone as fully production-scheduled, confirm Supabase Cron/Vault calls the protected scheduler route with `SCHEDULER_SECRET` and due checks are persisted once per scheduled window.
