# TuesdayOps Production Verification Audit

Date: 2026-06-18

Verifier branch: `codex/core-blocker-10-production-verification`

Verified integration base: `origin/main` at `0dd6ef4fca5ff867d55f3d32da7ef943a8d1a1d0` plus this verification audit branch.

Production URL: `https://tuesday-ops.vercel.app`

Scope:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No general observability, eval-suite, CRM, client-portal, billing-management, workflow-builder, or integration-platform scope was added.

## Main Coordination

- Fetched `origin/main` on 2026-06-18 before the first verification pass.
- At the first pass, `HEAD`, local `main`, and `origin/main` all pointed at `161671dc1f0e959c9c0181ebadd08f3346ca063a`.
- Before merge, `origin/main` advanced to `0dd6ef4fca5ff867d55f3d32da7ef943a8d1a1d0` with SSRF endpoint-safety, abuse-protection, and tenant-isolation hardening from other core-blocker lanes.
- Merged the latest `origin/main` into this verification branch and resolved the only conflict in `CHANGELOG.md` by preserving all blocker entries plus the production verification entry.
- Verification below is for the integrated tree containing latest `origin/main` plus this production verification audit.

## Documents Reviewed

- `AGENTS.md`
- `README.md`
- `PRD.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `TASKS.md`
- `ACCEPTANCE_CRITERIA.md`
- `SECURITY.md`
- `REPORTING_SPEC.md`
- `TESTING.md`
- `TUESDAYOPS_CORE_LOOP_AUDIT.md`
- `TUESDAYOPS_UI_UX_AUDIT.md`
- `TUESDAYOPS_ABUSE_PROTECTION_AUDIT.md`
- `TUESDAYOPS_SSRF_ENDPOINT_SAFETY_AUDIT.md`
- `TUESDAYOPS_TENANT_ISOLATION_AUDIT.md`

## Commands Run

All Node-based commands were run with the bundled supported Node runtime (`v24.14.0`). The default shell Node was `v20.18.0`, below the repository floor of `>=20.19.0`, so it was not used for the verification gate.

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm run smoke:production
PRODUCTION_E2E_URL=https://tuesday-ops.vercel.app npm run e2e:production
npm audit --audit-level=moderate
```

Results:

- `npm ci`: passed, 0 vulnerabilities.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 60 test files and 325 tests.
- `npm run build`: passed.
- `npm run e2e`: passed, 8 Playwright tests.
- `npm run smoke:production`: passed, 1 production smoke test.
- `PRODUCTION_E2E_URL=https://tuesday-ops.vercel.app npm run e2e:production`: passed, 1 deployed core-loop Playwright test.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.

Notes:

- The first local `npm run e2e` attempt failed before app startup because this worktree had no `.env.local` and the Next server could not load `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The suite was rerun with the existing local QA environment loaded without printing secret values; the rerun passed.
- The first deployed E2E attempt skipped because QA Supabase service credentials were absent from this worktree environment. It was rerun with the same hidden QA environment loading and passed.
- After latest `origin/main` was merged, local E2E exposed two test robustness issues: the onboarding spec could submit before the controlled client form had hydrated, and scheduled-check screenshots could inject Playwright caret-hiding styles before React hydration finished. The E2E specs were hardened with hydration/value waits, workflow-filtered issue assertions, and `caret: "initial"` screenshots; focused reruns and the full E2E suite then passed.

## Local Core-Loop E2E

`npm run e2e` passed all 8 Playwright tests.

The local suite covered:

- confirmed QA sign-in and agency onboarding
- client creation
- workflow creation/import
- manual check execution
- scheduled check execution through the protected scheduler route with targeted `checkId`
- issue creation, assignment, source-check rerun, report inclusion toggle, resolution note, and resolved issue reporting
- synthetic test pack failure and later recovery
- report generation from stored check/issue/test data
- PDF export and authenticated PDF download
- cross-tenant report download rejection
- billing limit enforcement and safe billing feedback

## Production Smoke

`npm run smoke:production` passed against `https://tuesday-ops.vercel.app`.

Additional direct probes on 2026-06-18 confirmed:

- `GET /api/health`: `200`, `status: ready`, `launchReady: true`.
- Provider readiness groups in `/api/health`: app, Supabase, scheduler, email, billing, and observability were all `ready`.
- `HEAD /`: `200` with browser security headers.
- `HEAD /issues`: `307` redirect to `/sign-in`.
- `POST /api/scheduler/run-due-checks` without a secret: `401`.
- `POST /api/public/run-log` without a bearer token: `401`.
- `POST /api/stripe/webhook` without a Stripe signature: `400`.
- `HEAD /sentry-example-page`: `404`.
- `GET /api/sentry-example-api`: `404`.

Observed response headers included:

- `Content-Security-Policy: frame-ancestors 'none'`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

## Production Core-Loop E2E

`PRODUCTION_E2E_URL=https://tuesday-ops.vercel.app npm run e2e:production` passed.

The deployed E2E created real QA tenant records in the configured Supabase project and verified:

- confirmed QA auth
- agency creation
- client creation
- workflow creation
- check execution and persisted failed run data
- issue creation from the failed check
- report generation from stored source data
- report preview
- PDF generation
- authenticated PDF download
- cross-tenant PDF download rejection
- report send action failure is safe and does not expose provider/env details

The latest QA report row from this run had:

- `status`: `failed`
- `send_error`: `Report email could not be sent. Check the recipient and try again.`

This is expected for the E2E recipient domain (`example.invalid`) and confirms safe report-send failure handling. It does not prove successful live Resend delivery to a real recipient.

## Production Scheduler Verification

The protected production scheduler route was also exercised with the configured scheduler secret and targeted QA `checkId` values from production E2E data.

Earlier completed targeted result:

```json
{
  "ok": true,
  "attempted": 1,
  "completed": 1,
  "skipped": 0,
  "failed": 0
}
```

Final post-merge targeted request result:

```json
{
  "ok": true,
  "attempted": 0,
  "completed": 0,
  "skipped": 0,
  "failed": 0
}
```

The final targeted check was accepted by the protected route but was not due. A direct `get_due_health_checks` query found no safe QA `tuesday-ops.vercel.app/api/e2e...` endpoint due at that moment, so no broad production scheduler sweep was run. Local E2E verifies the protected scheduler execution/idempotency path end to end, and the earlier targeted production run verified one completed production scheduled execution without sweeping unrelated due checks.

## Tenant Isolation

Tenant isolation was smoke-tested through Playwright:

- Local E2E passed cross-tenant report PDF rejection.
- Production E2E passed cross-tenant report PDF rejection against deployed app data.

Tenant-owned data remains scoped by `agency_id`, RLS/composite tenant keys, and service-layer membership checks as documented in `DATA_MODEL.md`, `SECURITY.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.

## Provider Dependencies

Observed production readiness:

- Supabase: ready through `/api/health` and production E2E data creation/query paths.
- Supabase Cron / Vault scheduler config: ready through `/api/health`; protected scheduler route also completed one targeted production scheduled run.
- Resend: ready through `/api/health`, but live delivery was not verified because the automated production E2E intentionally used an invalid recipient domain.
- Stripe: ready through `/api/health`; unsigned production webhook rejection was verified. A real test-mode Checkout and Customer Portal pass was not executed in this audit.
- Sentry: ready through `/api/health`; gated Sentry smoke routes returned `404`.
- PostHog: not launch-blocking per current docs and readiness behavior.

## Remaining Launch Gaps

Code blockers:

- None found in this pass.

Provider/configuration blockers:

- Verify one live Resend report email send with a safe real recipient/domain. The automated production E2E proves safe failure handling and PDF generation, not real inbox delivery.
- Run one Stripe test-mode Checkout and Customer Portal pass against the configured production deployment without creating unintended live billing effects.

Non-blocking operational note:

- This worktree itself does not contain `.env.local`. Future local/deployed E2E verification needs QA Supabase service credentials supplied through the shell environment, CI secrets, or a local env file that is not committed.

## Acceptance Status

Accepted for the core-loop release gate against current `main`, with provider follow-ups above explicitly excluded from code readiness.

The deployed product is production-ready for the core offering paths verified here:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

Do not claim final paid-launch provider readiness until the live Resend delivery and Stripe test-mode Checkout/Portal checks are completed.
