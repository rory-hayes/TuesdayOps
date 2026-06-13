# Milestone 4 Issue Management QA Handoff

Date: 2026-06-13

## Scope Covered

This handoff covers the completed Milestone 4 issue-management slice:

- Failed/degraded manual check runs create issues.
- Repeated active failures dedupe by material failure fingerprint.
- Issue records track `fingerprint`, `last_seen_at`, and `occurrence_count`.
- Issue queue supports status, severity, client, and workflow filters.
- Issue detail panel exposes client-safe suggested action, occurrence count, and resolution context.
- Issues can be assigned, resolved with a note, or ignored.

Milestone 4 scheduled jobs and alerts are still pending.

## Implementation Summary

- Added migration `20260613144638_issue_dedupe_fields.sql`.
- Added issue engine coverage in `src/lib/issues/engine.test.ts`.
- Added issue service/actions in `src/lib/issues/service.ts`.
- Wired `runCheckAction` to create/update issues after failed/degraded check-run persistence.
- Updated the Issues page to be an actionable queue.
- Updated data mapping/types so UI can show owner state, last seen, and occurrence count.

## Verification Results

Static checks:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: passed, 4 files / 12 tests
- `npm run build`: passed

Database:

- `supabase db push --dry-run`: one pending migration found
- `supabase db push --yes`: applied `20260613144638_issue_dedupe_fields.sql`
- `supabase migration list --linked`: local and remote both show `20260613111357` and `20260613144638`

E2E:

- Confirmed unauthenticated `/` redirects to `/sign-in`.
- Created a confirmed disposable QA user through Supabase Admin API for browser testing.
- Signed in and created a new agency workspace.
- Created client `QA Issue Client`.
- Created workflow `QA Failing Endpoint` pointing at `https://httpbingo.org/status/500`.
- Ran the generated health check and confirmed:
  - workflow status became `failed`
  - run history stored HTTP `500`
  - one high-severity open issue was created
- Ran the same check again and confirmed:
  - run history contains two failed runs
  - issue queue still contains one issue
  - occurrence count increased to `2`
- Assigned the issue and confirmed:
  - status moved to `in_review`
  - owner changed to `Assigned`
- Resolved the issue with a note and confirmed:
  - status moved to `resolved`
  - resolution note persisted
  - resolved filter selected correctly after reload
- Signed out and confirmed direct `/issues` access redirects to `/sign-in`.

## Findings

- Public sign-up currently creates unconfirmed users in the remote Supabase project. This is acceptable for production, but E2E needs a documented QA user creation path or a test-only auth seed.
- The first resolve E2E pass exposed a filter UI issue where the select visually retained `in_review` after redirecting to `?status=resolved`; this was fixed by remounting selects when URL-backed defaults change.
- The issue queue is now report-ready for resolved issue summaries, but report aggregation has not yet been implemented.

## Current State

The MVP loop now reaches:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution
```

The remaining MVP loop gap is:

```txt
Resolution -> Monthly Report
```

Scheduled execution and alerts are not yet complete, so issue creation currently happens from manual check runs only.

## Recommended Next Work

1. Finish Milestone 4 with scheduled check execution before email alerts.
2. Add a repeatable QA auth/seed script so E2E does not depend on manual service-key handling.
3. Move report preview/aggregation ahead of synthetic test packs, because resolved issues are now available as real report source data.
4. Add CI or a local `e2e` script once Playwright dependencies are formalized.
