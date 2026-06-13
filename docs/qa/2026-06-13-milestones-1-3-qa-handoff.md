# TuesdayOps QA Handoff — Milestones 1-3

Date: 2026-06-13  
Branch: `codex/supabase-m1-m3`

## Scope

This handoff covers the implementation state for:

- Milestone 1: Auth and Agency Workspace
- Milestone 2: Clients and Workflows
- Milestone 3: Endpoint Health Checks

The intended MVP loop strengthened by this slice is:

```txt
Agency -> Client -> Workflow -> Check -> Check Run
```

Issue creation/deduplication, scheduled jobs, alerts, test packs, reports, and billing remain later milestones.

## Current Product State

### Milestone 1: Auth and Agency Workspace

Implemented:

- Supabase SSR browser/server/proxy clients using `@supabase/ssr`.
- Protected app routes for dashboard, clients, workflows, checks, issues, reports, and settings.
- Sign-up, sign-in, and sign-out flows using server actions.
- Agency onboarding form with default brand color.
- Supabase migration for `profiles`, `agencies`, and `memberships`.
- Tenant membership helpers and RLS policies.
- `create_agency_for_current_user` RPC to create the first agency and owner membership atomically.

QA focus:

- Confirm unauthenticated users redirect to `/sign-in`.
- Confirm a signed-in user without membership redirects to `/onboarding`.
- Confirm onboarding creates exactly one agency and owner membership.
- Confirm users cannot read/write another agency's data.

### Milestone 2: Clients and Workflows

Implemented:

- Supabase migration for `clients` and `workflows`, including tenant-matched composite foreign keys.
- Tenant-scoped operational data loader replacing protected seed-data reads.
- Clients page with create, search/filter, update, and archive actions.
- Workflows page with add-workflow form.
- Workflow creation creates a default endpoint health check.
- Workflow auth config is encrypted before persistence when auth credentials are supplied.
- Workflow detail page shows endpoint metadata, checks, and run history.

QA focus:

- Create/list/update/archive client records.
- Confirm archived clients remain tenant-scoped and stop counting as active.
- Create a workflow for an active client.
- Confirm workflow auth secrets are not displayed after creation.
- Confirm workflow rows are visible only to the owning agency.

### Milestone 3: Endpoint Health Checks

Implemented:

- Supabase migration for `checks` and `check_runs`.
- Check config validation with Zod.
- HTTP check runner supporting GET/POST/PUT/PATCH, headers, timeouts, status code, and latency capture.
- Assertion engine supporting:
  - `status_code`
  - `latency_under`
  - `field_exists`
  - `equals`
  - `not_contains`
- Manual Run buttons on checks and workflow detail pages.
- Check run persistence with status, status code, latency, redacted response summary, assertion results, and error message.
- Workflow health summary updates after manual runs.

QA focus:

- Create a health check for a workflow.
- Run a check against a known healthy endpoint.
- Confirm a `healthy` check run is stored.
- Run a check against a failing endpoint.
- Confirm a `failed` check run is stored with a safe error/summary.
- Confirm response summaries redact obvious secret-like values.

## Verification Run

Passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Results:

- Lint: passed
- Typecheck: passed
- Unit tests: passed, 3 files, 8 tests
- Production build: passed

Covered by automated unit tests:

- Portfolio/domain summary behavior from the foundation.
- Slug generation.
- Endpoint assertion evaluation.

## E2E Status

Full authenticated E2E was attempted but not completed.

Planned E2E path:

1. Start local Supabase.
2. Run migration.
3. Start the Next.js app with local Supabase env vars.
4. Sign up.
5. Create agency.
6. Add client.
7. Add workflow pointing at a local healthy HTTP endpoint.
8. Run check.
9. Verify check history persisted.

Blockers encountered:

- Initial `supabase start` failed because port `54321` was already allocated by another local Supabase project.
- TuesdayOps local Supabase ports were moved to `55420-55429` in `supabase/config.toml`.
- Retried `supabase start`; the CLI stalled in schema initialization and had to be interrupted.
- Retried `supabase db start`; the database container exited with `exit 137`, which usually indicates Docker killed the process under resource pressure.
- No remote Supabase env values were available in this shell, and no secrets were committed.

Conclusion:

- Code-level verification is green.
- The final migration file could not be validated against a running Supabase database because the local stack never reached a usable status.
- Full sign-up/onboarding/client/workflow/check browser E2E still needs to be rerun once Supabase is available locally or the remote project environment is configured for the branch.

## Environment Requirements

Required app env:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
WORKFLOW_AUTH_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Reserved for future privileged server flows:

```txt
SUPABASE_SECRET_KEY=
```

Do not expose `SUPABASE_SECRET_KEY`, database passwords, or workflow auth secrets to the browser.

## Data and Security Notes

- Tenant-owned tables include `agency_id`.
- Child records use tenant-matched composite foreign keys where practical to prevent cross-agency object references by UUID.
- RLS is enabled on `profiles`, `agencies`, `memberships`, `clients`, `workflows`, `checks`, `check_runs`, and `issues`.
- Direct first-membership creation is avoided through the onboarding RPC.
- Workflow auth config is encrypted with AES-256-GCM before persistence.
- The frontend does not render encrypted auth config.
- Check response storage is summary-only with basic redaction for emails, bearer tokens, and common secret-like fields.

## Known Gaps Before Next Milestones

- Remote Supabase migration was not applied by Codex in this run.
- Full browser E2E remains blocked until Supabase is reachable.
- Scheduled checks are not implemented.
- Failed checks do not yet create or dedupe issues.
- Issue resolve/ignore workflow is not implemented.
- Synthetic test packs are not implemented.
- Report generation/PDF export is not implemented.
- Alerts, billing, analytics, and error tracking integrations are not implemented.
- Supabase TypeScript types are hand-shaped rather than generated from the database.
- `npm install` reported Node engine warnings for local Node `v20.18.0`; some dependencies request `v20.19.0+`.
- `npm audit` reported 5 vulnerabilities during dependency install; this still needs triage.

## Recommended QA Checklist

- Apply migration to a clean Supabase project.
- Seed or create two users in two agencies.
- Verify cross-agency RLS for clients, workflows, checks, check runs, and issues.
- Complete the full E2E path listed above.
- Test check runner against:
  - 200 response under latency threshold
  - 500 response
  - timeout
  - response body containing an email/token-like value
  - malformed JSON with JSON-path assertions
- Confirm Vercel environment variables are configured before deploying protected routes.
- Confirm no `.env.local` or secret-bearing files are committed.
