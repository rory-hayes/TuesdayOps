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

Use Playwright later for:

- sign up/login
- create client
- create workflow
- run check
- create issue
- generate report

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
