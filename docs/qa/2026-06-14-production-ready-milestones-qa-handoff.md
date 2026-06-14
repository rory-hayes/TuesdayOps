# Production-Ready Milestones QA Handoff — 2026-06-14

## Scope

This branch implements the updated production-readiness order after Milestone 8:

1. Production provider readiness
2. Seamless endpoint/workflow onboarding
3. Security and tenant hardening
4. Operational reliability
5. Report polish
6. Launch gate and QA handoff

The work remains inside the TuesdayOps MVP loop:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report
```

## Product State

TuesdayOps now has production-readiness gates in the product UI rather than only in documentation.

- Settings shows provider readiness for app runtime, Supabase, scheduler/Inngest, Resend, Stripe, Sentry, and PostHog.
- `/api/health` exposes a public ready/degraded launch payload without secret values.
- Workflows can be created by manual entry or quick import from URL, cURL, OpenAPI JSON, or Postman collection JSON.
- Imported workflows use the same tenant, billing-limit, encrypted-auth, endpoint-safety, and health-check creation path as manual workflows.
- Production workflow endpoints block localhost, loopback, private IPv4 ranges, link-local/metadata ranges, and `.local` hostnames unless `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true` is explicitly set for local/private testing.
- Settings shows operational reliability from enabled checks, stale workflows, high-risk open issues, and report queue state.
- Reports show ready/review/blocked quality scoring before send/export.
- PDF and report email output now includes a concise monitoring coverage line.

## Focused Verification Completed During Implementation

- Baseline before changes:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test` passed: 17 files, 51 tests.
  - `npm run e2e` passed: 6 specs.

- Milestone 9:
  - Red test confirmed missing readiness module.
  - `npx vitest run src/lib/production/readiness.test.ts` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test` passed: 18 files, 55 tests.

- Milestone 10:
  - Red parser test confirmed missing onboarding module.
  - Red E2E confirmed missing quick import UI.
  - `npx vitest run src/lib/workflows/onboarding.test.ts` passed.
  - `npm run e2e -- e2e/workflow-onboarding.spec.ts` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test` passed: 19 files, 60 tests.

- Milestone 11:
  - Red test confirmed missing endpoint safety module.
  - `npx vitest run src/lib/security/endpoint-url.test.ts src/lib/checks/execution.test.ts src/lib/checks/scheduled-runner.test.ts` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test` passed: 20 files, 65 tests.
  - `npm run e2e -- e2e/workflow-onboarding.spec.ts` passed.

- Milestone 12:
  - Red test confirmed missing operational reliability module.
  - `npx vitest run src/lib/production/operational-reliability.test.ts` passed.
  - `npm run e2e -- e2e/billing-limits.spec.ts e2e/workflow-onboarding.spec.ts` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test` passed: 21 files, 67 tests.

- Milestone 13:
  - Red tests confirmed missing report quality module and missing coverage line in PDF/email.
  - `npx vitest run src/lib/reports/quality.test.ts src/lib/reports/pdf.test.ts` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test` passed: 22 files, 70 tests.
  - `npm run e2e -- e2e/reports.spec.ts` passed.

## Final Branch Verification

Pending final gate:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm audit --audit-level=moderate
```

## QA Test Priorities

1. Provider readiness:
   - Open `/api/health`.
   - Confirm no secret values appear in response JSON.
   - Confirm Settings provider readiness matches configured/missing env vars.

2. Workflow import:
   - Import from a direct URL.
   - Import from a cURL command with bearer auth and JSON body.
   - Import from OpenAPI JSON with a server URL and POST operation.
   - Import from Postman collection JSON with `x-api-key` header.
   - Confirm each path creates one workflow and one enabled health check.
   - Confirm auth secrets are not visible in the UI after creation.

3. Endpoint safety:
   - In production, attempt to add `http://localhost:3000`, `http://127.0.0.1`, `http://10.0.0.1`, and `http://169.254.169.254`.
   - Confirm each is blocked with safe copy.
   - Confirm public HTTPS endpoints still work.

4. Operational reliability:
   - Confirm Settings shows attention when no checks are enabled.
   - Confirm stale workflow state appears when check data is older than twice the configured frequency.
   - Confirm high/critical open issues show as attention.
   - Confirm a ready/sent report improves the report queue signal.

5. Report readiness:
   - Generate a report with source data and confirm readiness score is ready or review.
   - Generate a report without check runs and confirm it is blocked.
   - Confirm PDF and email text include monitoring coverage.

6. Tenant isolation regression:
   - Repeat report download cross-tenant E2E.
   - Confirm workflow details and generated report PDFs are inaccessible across agencies.

## Known Gaps

- Sentry and PostHog are readiness-gated but SDK/client event capture is not implemented in this branch.
- Slack alerts remain a V1 roadmap item.
- OpenAPI import currently accepts pasted JSON. Fetching OpenAPI from a URL should wait until SSRF-safe fetch controls are designed.
- YAML OpenAPI import is not implemented because the repo has no YAML parser dependency and JSON import covers the MVP handoff path.
- Deep native n8n/Make/Zapier APIs remain out of MVP scope; templates/imports cover the current onboarding need.

## Recommendation

Move next into provider-side production configuration and deployment validation:

- Configure live Sentry/PostHog, Resend sender, Stripe webhook, and Inngest production keys.
- Run the full production smoke checklist against the Vercel URL.
- Keep Slack alerts and deeper native integrations after provider wiring, endpoint import QA, and report readiness pass with a design partner.
