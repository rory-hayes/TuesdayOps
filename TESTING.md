# TuesdayOps Testing Strategy

## Testing philosophy

TuesdayOps is a controls and proof product. Tests should prioritize correctness, tenant isolation, deterministic checks, and report accuracy.

## Test types

### Unit tests

Use for:

- assertion evaluation
- check status calculation
- issue severity mapping
- report aggregation logic
- redaction helpers
- pricing/limit helpers

### Integration tests

Use for:

- client/workflow/check API routes
- check runner service
- issue creation flow
- report generation flow

### E2E/smoke tests

Use Playwright or the in-app browser for:

- sign up/login
- create client
- create workflow
- run check
- create issue
- generate report

Current Milestones 1-3 E2E status:

- Static verification passes with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Full authenticated E2E has passed against the remote Supabase project from the local app.
- Covered flow: sign in, onboarding, client creation, workflow creation, manual check run, persisted run history, sign-out redirect, second-tenant empty state, and cross-tenant workflow 404.
- Local Supabase startup was attempted first, but Docker killed the database-only startup with `exit 137`; remote Supabase was used for final E2E.

Current Milestone 4 issue-management E2E status:

- Static verification passes with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Applied the issue-dedupe Supabase migration to the linked remote project.
- Full authenticated E2E passed against the remote Supabase project from the local app.
- Covered flow: confirmed QA user sign-in, onboarding, client creation, failing workflow creation, manual failed check run, issue creation, repeated failed check dedupe, occurrence count update, assignment, resolution note, resolved-status filter, sign-out redirect, and protected `/issues` redirect.
- Public sign-up currently creates unconfirmed users in this Supabase project; E2E used a disposable confirmed QA user created through the Supabase Admin API with a service-role key captured only in process memory.

## Critical test areas

### Assertion engine

Test:

- field exists
- field equals
- not contains
- status code expected
- latency under threshold
- JSON parse failure
- missing response body

### Check runner

Test:

- healthy result
- degraded latency result
- failed status code result
- timeout result
- network error result
- assertion failure result

### Issue dedupe

Test:

- repeated same failure updates existing open issue
- new failure type creates new issue
- resolved issue can reopen or create new issue based on rules

### Report aggregation

Test:

- counts checks correctly
- counts issues correctly
- excludes non-reportable issues
- includes resolved issue summaries
- respects period boundaries

### Security

Test:

- user cannot access another agency's client
- user cannot access another agency's workflow
- secrets not returned in API responses
- report does not include raw secret-bearing data

## Required scripts

Add these scripts if missing:

```json
{
  "scripts": {
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```
