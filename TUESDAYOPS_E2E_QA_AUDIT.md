# Tuesday E2E QA Audit

Date: 2026-06-20

## Executive Verdict

Conditional go for design-partner production use.

The core MVP loop is functional end to end: Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Monthly Report. Automated unit, build, audit, and browser E2E checks pass after the fixes in this pass.

Remaining launch caveats are operational rather than app-blocking: run the app with Node >=20.19.0, complete live Resend sender/domain verification, and perform a Stripe test-mode checkout/webhook pass against the production deployment.

## Environment

- Workspace: `/Users/rory/Documents/TuesdayOps`
- Branch: `main`
- Node used locally: `v20.18.0`
- Repo engine requirement: `>=20.19.0`
- npm: `10.8.2`
- Framework: Next.js `16.2.9`
- Browser E2E: Playwright Chromium
- Build env source: local `.env.local` loaded by Next.js. No secret values were copied into this report.
- Missing optional doc: `TUESDAYOPS_V1_BUILD_VERIFICATION.md` was not present in the repo.

## Inventory

Reviewed the app surface across:

- Auth and onboarding: sign-up, sign-in, onboarding, workspace creation.
- Dashboard and drilldowns: portfolio stats, charts, clients, workflows, action center.
- Core operations: health checks, scheduled checks, synthetic test packs, check runs, issue creation, issue recovery.
- Reporting: report generation, readiness gates, PDF export, send flow, report history, report detail editing.
- Billing: plan display, current plan state, starter limit handling.
- Public/server APIs: run-log ingestion, scheduler triggers, report PDF download, Stripe webhook.
- Security primitives: RLS migrations, tenant agency boundaries, endpoint SSRF protection, encrypted workflow auth, rate limiting, audit redaction.

## E2E Results

Passed:

- `e2e/alerts.spec.ts`
- `e2e/billing-limits.spec.ts`
- `e2e/drilldowns-feedback.spec.ts`
- `e2e/onboarding-demo.spec.ts`
- `e2e/reports.spec.ts`
- `e2e/scheduled-checks.spec.ts`
- `e2e/test-packs.spec.ts`
- `e2e/workflow-onboarding.spec.ts`

Full command result:

```txt
npm run e2e
8 passed (2.0m)
```

## Bugs Fixed

- Fixed the Vitest/jsdom test runner failure by pinning `jsdom` to a compatible release.
- Removed ambiguous password reveal labels that made auth tests and screen-reader names collide with the password input.
- Reworked clickable table rows so the full row drills down without nested competing link roles.
- Added workflow registry search, status filtering, and sorting to match the documented registry behavior.
- Simplified the Reports index into a generated-report list and removed the busy sample report preview.
- Replaced the report detail readiness card with a compact Ready / Not ready status control and readiness dialog.
- Made sent reports genuinely read-only in the inline report editor.
- Wired inline report pencil edits through the server action so individual summary, module, and recommendation edits persist.
- Updated report send confirmation to name the client.
- Updated E2E tests for collapsed check/test-pack configuration panels.
- Rebranded visible TuesdayOps copy to Tuesday in the UI touched by this pass.

## UX Findings

Improved:

- Reports now have a clearer information hierarchy: list first, detail on click.
- Report detail now focuses on the actual report, with small status chips at the top instead of a full readiness card.
- Editable report copy is attached directly to the relevant content through pencil controls.
- Workflow rows and dashboard drilldowns are easier to target because row-level click behavior is consistent.
- The workflow registry is more useful for repeated operational work through search/filter/sort.

Residual UX follow-ups:

- Continue checking chart responsiveness visually as more real data accumulates.
- Consider whether the run-log API tab should remain customer-facing for non-technical agency users or move behind an advanced/integration section.

## Security Findings

No P0/P1 app security blocker found in this pass.

Reviewed controls:

- Tenant-owned data uses `agency_id` and RLS policies in migrations.
- Core cross-table references use composite agency foreign keys for clients, workflows, checks, runs, issues, reports, and test packs.
- Report PDF download requires an authenticated workspace, filters by `agency_id`, re-checks readiness, and downloads from the canonical `{agencyId}/{reportId}.pdf` storage path.
- Workflow endpoint URLs block embedded credentials and secret query params.
- Workflow checks and OpenAPI imports resolve hostnames server-side, reject private/local resolved addresses in production, pin the resolved address, block redirects, and cap response sizes.
- Workflow auth configs are AES-GCM encrypted and are not returned to the frontend.
- Public run-log ingestion uses hashed API keys, workflow/key matching, pre-auth and authenticated rate limits, invalid-key caching, and sanitized errors.
- Scheduler routes require configured secrets and rate limiting.
- Audit metadata redacts secret-like keys.

Residual security follow-ups:

- Ensure `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS` is not set to `true` in production.
- Verify production env vars are configured through the host secret manager only.
- Perform a final production smoke test against deployed scheduler and Stripe webhook URLs.

## Test Results

Passed:

```txt
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm audit --audit-level=moderate
```

Unit test total:

```txt
83 test files passed
428 tests passed
```

Dependency audit:

```txt
found 0 vulnerabilities
```

## Launch Blockers

No code-level P0/P1 blocker remains from this pass.

Operational blockers before full public launch:

- Run CI/deploy with Node >=20.19.0. Local verification used Node v20.18.0, which is below the repo engine requirement.
- Complete live Resend sender/domain verification and live send smoke.
- Complete Stripe test-mode checkout, customer portal, and webhook verification on the production URL.
- Confirm production scheduler secret and cron trigger are configured.

## Go / No-Go

Design partner demo: Go.

Limited production pilot: Go after Node/runtime alignment and provider smoke checks.

Full public launch: No-go until the remaining external provider checks are complete.
