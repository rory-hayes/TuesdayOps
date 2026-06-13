# Milestone 5 Test Packs QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-5-test-packs`

## Scope

This handoff covers Milestone 5 Test Packs:

- Test pack schema.
- Test case builder UI.
- Manual synthetic test pack runner.
- Test run persistence.
- Issue creation from failed synthetic tests.

The product loop under test is:

```txt
Workflow -> Test Pack -> Test Case -> Test Run -> Issue
```

## Implementation Summary

- Added tenant-scoped `test_packs`, `test_cases`, and `test_runs` tables.
- Added `issues.test_run_id` with a tenant-matched foreign key through `agency_id`.
- Added server actions for:
  - creating a test pack
  - creating a test case
  - running a test pack manually
- Reused the existing HTTP check runner and encrypted workflow auth configuration path.
- Added an MVP assertion builder:
  - expected status code
  - max latency
  - optional required JSON field
  - optional forbidden response text
- Failed synthetic runs create or update a reportable issue with a stable synthetic fingerprint.
- The Checks page now shows:
  - test pack creation
  - test case creation
  - run-pack action
  - case status
  - recent synthetic runs
  - pack pass rate derived from stored runs

## Database Changes

Migration applied to the linked remote Supabase project:

```txt
20260613162243_test_packs.sql
```

New tables:

```txt
test_packs
test_cases
test_runs
```

Updated table:

```txt
issues.test_run_id
```

Security notes:

- RLS is enabled on all new public tables.
- Authenticated users can only manage rows where `public.is_agency_member(agency_id)` is true.
- New child relationships use composite tenant foreign keys with `agency_id`.
- `issues.test_run_id` is linked through `(test_run_id, agency_id)` to prevent cross-tenant references.

## Verification Evidence

### Static and Unit Checks

Passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Unit coverage added for:

- synthetic runnable check config creation
- JSON input parsing
- synthetic issue draft creation
- MVP assertion builder output
- test run insert shaping
- repeat synthetic issue update shaping
- test pack pass-rate summary calculation

### Supabase Verification

Passed:

```bash
supabase db push --dry-run --linked
supabase db push --linked --yes
supabase migration list --linked
supabase db lint --linked --fail-on error
supabase db push --dry-run --linked
```

Remote migration history includes:

```txt
20260613111357
20260613144638
20260613153450
20260613160757
20260613162243
```

Final dry run result:

```txt
Remote database is up to date.
```

Supabase DB lint result:

```txt
No schema errors found
```

### E2E Verification

Focused Milestone 5 E2E passed:

```bash
npm run e2e -- e2e/test-packs.spec.ts
```

Result:

```txt
1 passed
```

Full E2E suite passed:

```bash
npm run e2e
```

Result:

```txt
3 passed
```

Covered flow:

- confirmed QA user sign-in
- onboarding
- client creation
- workflow creation
- test pack creation
- test case creation
- manual pack run
- persisted failed `test_runs` row
- issue creation linked to `test_run_id`
- Checks page failed state
- issue visibility in the issue queue

### Browser Smoke Check

The in-app browser DOM smoke check confirmed `/checks` rendered with:

- Synthetic test packs panel.
- Add test pack control.
- Add case control.
- Run pack control.
- Failed synthetic run state.
- E2E-created pack and case visible.

In-app browser screenshot capture timed out. Playwright CLI E2E captured the run state and is the stronger verification artifact for this milestone.

## Audit State

`npm audit --audit-level=moderate` still reports known upstream advisories:

- `postcss <8.5.10` through `next@16.2.9`
- `esbuild` through the current Vite/plugin-react dev toolchain

The suggested `npm audit fix --force` path would install breaking/downgrade versions, so no force fix was applied.

## Known Residual Risks

- Synthetic test packs currently run manually only; scheduled synthetic runs are not implemented yet.
- The assertion builder is intentionally MVP-sized and does not yet support equality assertions, multiple field builders, imports, or AI-judge checks.
- Passing synthetic runs do not auto-resolve existing synthetic issues; issue resolution remains an explicit user workflow.
- Test pack pass rate is derived from recent stored `test_runs`, not a stored aggregate.
- Inngest cloud scheduling and live Resend delivery remain separate production wiring items from Milestone 4.5 readiness.

## QA Recommendation

QA should verify:

- A user can create a pack for a workflow from `/checks`.
- A user can add a test case with JSON input and assertions.
- Running the pack stores a `test_runs` row.
- A failed case creates one reportable issue with `test_run_id`.
- Re-running the same failing case increments `occurrence_count` instead of creating duplicates.
- Another agency cannot read or mutate the pack, case, run, or synthetic issue through the app.
