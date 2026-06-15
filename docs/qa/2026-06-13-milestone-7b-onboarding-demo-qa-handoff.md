# Milestone 7B Onboarding and Demo Mode QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-7b-onboarding-demo`

Current status: superseded. Demo seeding was removed from the active MVP after this
handoff; onboarding now derives activation only from real tenant data.

## Scope

This historical handoff covered Milestone 7B before demo seeding was removed:

- Overview activation checklist.
- First client, workflow, check run, and report progress tracking.
- Tenant-scoped sample data mode.
- Demo client/workflow/check/issue/test pack/report seed flow.

The product loop under test is:

```txt
Agency -> Client -> Workflow -> Check Run -> Issue -> Monthly Report
```

## Implementation Summary

- Added `buildOnboardingProgress` for deriving activation state from stored tenant data.
- Added an Overview activation checklist with five steps:
  - create agency
  - add first client
  - add first workflow
  - run first check
  - create sample report, later renamed to create first report
- Added a tenant-scoped `seedSampleDataAction`.
- Demo data uses deterministic agency-scoped UUIDs and upserts to avoid duplicate rows.
- Demo data includes:
  - client
  - workflow
  - health check
  - healthy and failed check runs
  - open reportable issue
  - test pack, test case, and failed test run
  - ready-to-send monthly report
  - report items
- Added `agencies.sample_data_seeded_at` to prevent repeated user-triggered seeding.

## Database Changes

Migration applied to the linked remote Supabase project:

```txt
20260613173311_onboarding_demo_mode.sql
```

Updated table:

```txt
agencies.sample_data_seeded_at timestamptz
```

Security notes:

- No new public table was added.
- Seeded rows use existing tenant-owned tables and RLS policies.
- Demo workflow auth type is `none`; no auth secret or token is stored.
- Seeded data is scoped to the authenticated user's agency.

## Verification Evidence

Focused checks passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run e2e -- e2e/onboarding-demo.spec.ts
supabase migration list --linked
supabase db lint --linked --fail-on error
supabase db push --dry-run --linked
```

Focused unit result:

```txt
14 passed
40 passed
```

Focused E2E result:

```txt
1 passed
```

Covered E2E flow:

- confirmed QA user sign-in
- agency onboarding
- activation checklist starts at `1 of 5`
- historical check only: sample data seed action completed before the feature was removed

## Known Residual Risks

- Superseded: the sample data action has been removed from the active MVP.
- Demo records are realistic but synthetic and should not be treated as customer data.
- The seeded report PDF is not generated until the user runs the existing PDF action from Reports.
- The action does not use a database transaction, but deterministic IDs plus upserts make repeated attempts idempotent.
- Later Supabase CLI verification retries intermittently resolved the linked database over IPv6 and failed with `IPv6 is not supported on your current network`. The migration had already applied, the migration list showed `20260613173311` on local and remote, schema lint passed, and dry-run showed the remote database up to date before this network-mode issue recurred.

## QA Recommendation

QA should verify:

- A fresh agency sees the activation checklist at `1 of 5`.
- Clicking `Seed demo data` creates one demo client and disables repeat seeding.
- The checklist reaches `5 of 5`.
- Demo records are not visible to another agency.
- Reports and Issues pages show the seeded report and issue.
