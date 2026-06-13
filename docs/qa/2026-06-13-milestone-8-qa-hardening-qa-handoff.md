# Milestone 8 QA Hardening Handoff

Date: 2026-06-13

Branch: `codex/milestone-8-qa-hardening`

## Scope

This handoff covers focused QA hardening for the existing MVP loop:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report
```

No new product surface was added. The work adds automated coverage around high-risk production behaviors.

## Implementation Summary

- Expanded report E2E coverage to prove tenant isolation on generated PDF downloads.
- Expanded billing E2E coverage to prove starter workflow limits in the browser flow.
- Added targeted scheduler smoke support to keep scheduled-check E2E deterministic in shared Supabase projects with older enabled health checks.
- Added Stripe webhook route tests for:
  - missing `stripe-signature`
  - invalid signatures
  - duplicate event acknowledgement without duplicate inserts or billing mutations

## Verification Evidence

Focused E2E result:

```bash
npm run e2e -- e2e/billing-limits.spec.ts e2e/reports.spec.ts
```

```txt
2 passed
```

Focused unit result:

```bash
npm run test -- src/app/api/stripe/webhook/route.test.ts
```

```txt
17 files passed
49 tests passed
```

Targeted scheduler unit result:

```bash
npx vitest run src/lib/checks/scheduler.test.ts src/lib/checks/scheduled-runner.test.ts
```

```txt
8 tests passed
```

## Covered Behavior

Report tenant isolation:

- Agency A signs in, creates a client/workflow, generates a report, and exports a PDF.
- Agency A can download the PDF through `/api/reports/:reportId/download`.
- Agency B signs in with a separate workspace.
- Agency B receives `404` for Agency A's PDF URL.

Starter workflow limits:

- Starter agency sees billing usage.
- Starter agency creates one client.
- Starter agency creates three workflows.
- The fourth workflow creation is blocked with upgrade copy.
- Previously created workflows remain visible.

Stripe webhook route safety:

- Missing signatures return `400` before Stripe verification or database access.
- Invalid signatures return `400` before billing event writes.
- Duplicate verified event IDs return `{ received: true, duplicate: true }` without insert/update calls.

Scheduler smoke stability:

- `POST /api/scheduler/run-due-checks` keeps the existing no-body batch behavior.
- The same protected route accepts optional `{ "checkId": "uuid" }` for targeted smoke tests.
- Scheduled-check and alert E2E target the health check created inside the current test run.

## Known Residual Risks

- Live Stripe Checkout and subscription updates still require production Stripe Dashboard configuration.
- Live provider smoke tests remain separate from route-level webhook safety tests.
- Report tenant isolation is covered for authenticated download URLs; broader cross-tenant URL fuzzing remains a QA expansion item.
- The targeted scheduler body is an operational smoke-test helper, not a public user-facing API.

## QA Recommendation

QA should keep this milestone in the pre-design-partner regression set and rerun it after any change to:

- report download authorization
- Supabase storage paths
- agency membership loading
- plan-limit helpers
- Stripe webhook processing
