# TuesdayOps Abuse Protection Audit

Date: 2026-06-18

Scope: Core Blocker 8 - abuse protection, rate limits, and safe public ingestion for the core loop:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

This pass did not add marketplace ingestion, webhook platform scope, workflow-builder scope, client portals, eval tooling, or general observability features.

## Inspected Files

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, `SECURITY.md`, `TESTING.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.
- Supabase changelog index for recent breaking changes relevant to database/API behavior.
- Rate-limit utilities and tests: `src/lib/security/rate-limit.ts`, `src/lib/security/rate-limit.test.ts`, and `supabase/migrations/20260617192044_persistent_rate_limits.sql`.
- Public ingestion: `src/app/api/public/run-log/route.ts`, `src/app/api/public/run-log/route.test.ts`, `src/lib/run-logs/api-keys.ts`, `src/lib/run-logs/api-keys.test.ts`, `src/lib/run-logs/service.ts`, `src/lib/run-logs/service.test.ts`, `src/lib/run-logs/actions.ts`, and `src/components/workflows/run-log-key-panel.tsx`.
- Check execution paths: `src/lib/checks/service.ts`, `src/lib/issues/service.ts`, `src/lib/checks/execution.ts`, `src/lib/checks/execution.test.ts`, `src/lib/checks/scheduled-runner.ts`, `src/lib/checks/scheduled-runner.test.ts`, `src/app/api/scheduler/run-due-checks/route.ts`, and `src/app/api/scheduler/run-due-checks/route.test.ts`.
- Audit/redaction support: `src/lib/audit/events.ts` and `src/lib/audit/events.test.ts`.

## Issues Found

- Public run-log ingestion had a pre-auth client/IP bucket, but no separate global pre-auth bucket before bearer-token and payload work.
- Repeated invalid bearer attempts using the same key still re-entered the run-log auth/storage path after pre-auth throttling, causing avoidable database lookup work.
- Manual check execution used a user-scoped agency/user bucket, but there was no explicit agency-wide bucket for aggregate tenant manual runs.
- Scheduled check execution had scheduler-route throttles, but each scheduled check run did not consume a per-agency execution bucket before outbound workflow work.
- Existing logs covered scheduled-check failures with redaction, but invalid public run-log bearer attempts were not logged with safe investigation context.

## Fixes Made

- Added a DB-backed global pre-auth public run-log bucket alongside the existing client/IP pre-auth bucket. Both run before bearer token validation, payload parsing, token-scoped throttling, or run-log persistence.
- Added a short-lived in-memory invalid bearer cache keyed by a truncated SHA-256 fingerprint. Repeated attempts with the same invalid bearer key return the same safe `401` response without re-calling the run-log storage/auth path.
- Added safe invalid-bearer logging with client identifier and truncated token fingerprint only. The log does not include raw bearer tokens, auth headers, payloads, or error bodies.
- Added `src/lib/checks/rate-limits.ts` to centralize check execution buckets.
- Changed manual check execution and issue source-check reruns to consume both agency-wide and user-scoped DB-backed buckets.
- Changed scheduled check execution to consume a per-agency DB-backed bucket before each outbound check run. Exhausted buckets skip that scheduled run, log safe agency/check context, and keep the scheduler batch alive.

## Tests Added

- Public run-log global pre-auth throttling before token or payload work.
- Public run-log repeated invalid bearer regression coverage proving cached invalid keys avoid repeated run-log lookup work.
- Public run-log invalid bearer log redaction coverage proving raw tokens and payload secrets are not logged.
- Check execution rate-limit helper coverage for manual agency-wide plus user-scoped buckets.
- Check execution rate-limit helper coverage for scheduled agency-wide buckets.
- Scheduled runner coverage proving exhausted agency buckets skip execution safely and log only agency/check/retry context.

## Commands Run

Passing:

```bash
npm install
npm install --no-save @rolldown/binding-darwin-arm64@1.0.3
npm run test -- src/app/api/public/run-log/route.test.ts
npm run test -- src/lib/checks/rate-limits.test.ts src/lib/checks/scheduled-runner.test.ts
npm run test -- src/app/api/public/run-log/route.test.ts src/lib/checks/rate-limits.test.ts src/lib/checks/scheduled-runner.test.ts src/lib/security/rate-limit.test.ts src/app/api/scheduler/run-due-checks/route.test.ts src/lib/checks/execution.test.ts
npm run lint
npm run typecheck
npm run test
npm run build
npm run smoke:production
```

Expected failing/red checks before implementation:

```bash
npm run test -- src/app/api/public/run-log/route.test.ts
npm run test -- src/lib/checks/rate-limits.test.ts src/lib/checks/scheduled-runner.test.ts
```

The first test attempt initially failed before executing tests because `node_modules` was missing. After `npm install`, Vitest still needed the `@rolldown/binding-darwin-arm64` optional dependency installed into local `node_modules`; this did not change `package.json` or `package-lock.json`.

Final verification results:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 58 test files and 315 tests.
- `npm run build`: passed.
- `npm run smoke:production`: passed, 1 production smoke test.
- Focused API/rate-limit/check tests passed, 58 test files and 315 tests under the repo's `npm run test -- ...` script invocation.

## Remaining Gaps

- The invalid-bearer cache is intentionally per process and best-effort. It helps repeated same-key spam on a warm instance, but cross-instance and random-token abuse are controlled by the DB-backed pre-auth client/IP and global buckets.
- Production smoke passed against the deployed URL. Full production E2E still requires deployed QA service credentials and provider configuration.
- Supabase Cron timing still depends on deployed Vault secret and Cron configuration. The route and runner controls are covered locally.
