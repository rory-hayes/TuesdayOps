# TuesdayOps Workflow Maintenance Audit

Date: 2026-06-18

Scope: Core Blocker 5 - Workflow Maintenance, Editing, and Credential Rotation.

Core loop only:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

No workflow builder, CRM, client portal, native integrations, advanced permissions, eval platform, or broad observability scope was added.

## Files Inspected

- Required docs: `AGENTS.md`, `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, `SECURITY.md`, `TESTING.md`, and `TUESDAYOPS_CORE_LOOP_AUDIT.md`.
- Workflow services and helpers: `src/lib/workflows/service.ts`, `src/lib/workflows/lifecycle.ts`, `src/lib/workflows/lifecycle.test.ts`, `src/lib/workflows/onboarding.ts`, and `src/lib/workflows/onboarding.test.ts`.
- Check services and helpers: `src/lib/checks/service.ts`, `src/lib/checks/config.ts`, `src/lib/checks/config.test.ts`, `src/lib/checks/lifecycle.ts`, `src/lib/checks/lifecycle.test.ts`, `src/lib/checks/runner.ts`, and `src/lib/checks/execution.ts`.
- Secret handling: `src/lib/security/secrets.ts` and `src/lib/security/secrets.test.ts`.
- Workflow/check UI: `src/components/workflows/workflow-detail-page.tsx`, `src/components/workflows/add-workflow-dialog.tsx`, `src/components/workflows/workflows-page.tsx`, `src/components/checks/checks-page.tsx`, and `e2e/workflow-onboarding.spec.ts`.
- Data/history behavior: `DATA_MODEL.md`, workflow archive helpers, check disable helpers, and report/history references in the prior core-loop audit.

## Issues Found

- Workflow settings already supported editing endpoint metadata, credential rotation, and primary health-check config, but critical update/auth/upsert behavior lived inside the server action and lacked direct regression coverage.
- Secret rotation behavior needed explicit tests for preserving existing encrypted material on blank input, encrypting new secrets, clearing stored material when auth changes to `none`, and avoiding plaintext in returned update payloads.
- Primary health-check update/create behavior needed explicit coverage so workflow settings consistently maintain the scheduled health check.
- Check edit validation redirected with a generic message, and workflow-detail check edits could lose their workflow tab context on invalid submissions.
- Workflow settings had a Save action but no nearby keyboard-friendly Cancel affordance.
- Archive helper coverage asserted archive fields but did not explicitly guard against history-destructive payload shape.

## Fixes Made

- Added workflow lifecycle helpers for:
  - workflow update payload construction,
  - auth config construction,
  - auth preserve/rotate/clear update behavior,
  - primary health-check update/create mutation shaping.
- Rewired `updateWorkflowAction` and primary health-check upsert logic to use the tested helpers while preserving existing tenant-scoped database filters.
- Kept endpoint URL handling trim-and-store through the existing endpoint safety path, with update payload tests preserving path casing and signed query details.
- Added specific check config validation messages for status, latency, timeout, text, field, and regex inputs.
- Added hidden `workflowId` context to check edit forms so invalid edits from workflow detail return to the workflow Checks tab with a visible error.
- Added a Cancel link beside Save in workflow settings.
- Strengthened archive regression coverage to assert the archive update does not include check-run, issue, report, or delete-shaped fields.

## Tests Added

- `src/lib/workflows/lifecycle.test.ts`
  - endpoint path/query preservation in workflow update payloads,
  - method/frequency/report inclusion update shaping,
  - preserve existing encrypted secret on blank rotation field,
  - rotate new API-key secret without returned plaintext,
  - clear encrypted auth material when auth type is `none`,
  - reject auth type changes without a new secret,
  - primary health-check update/create mutation shaping,
  - archive history preservation regression.
- `src/lib/checks/lifecycle.test.ts`
  - specific check edit validation message formatting.
- `src/components/workflows/workflow-detail-page.test.tsx`
  - workflow settings render endpoint path/query details clearly,
  - saved secrets are not displayed in auth fields,
  - primary health-check fields are populated from stored config,
  - check edit forms keep workflow/tab context,
  - settings expose a Cancel affordance.

## Commands Run

```bash
curl -fsSL https://supabase.com/changelog.md | sed -n '1,120p'
npm install
npm install --include=optional
npm install --no-save @rolldown/binding-darwin-arm64@1.0.3
npx vitest run src/lib/workflows/lifecycle.test.ts
npx vitest run src/lib/checks/lifecycle.test.ts
npx vitest run src/components/workflows/workflow-detail-page.test.tsx
npx vitest run src/lib/checks/lifecycle.test.ts src/lib/workflows/lifecycle.test.ts
npx vitest run src/lib/workflows/lifecycle.test.ts src/lib/checks/lifecycle.test.ts src/lib/security/secrets.test.ts src/lib/checks/config.test.ts
npm run typecheck
npm run lint
npx vitest run src/lib/workflows/lifecycle.test.ts src/lib/checks/lifecycle.test.ts src/lib/security/secrets.test.ts src/lib/checks/config.test.ts src/components/workflows/workflow-detail-page.test.tsx
npm run test
npm run build
npm run e2e
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy npm run e2e
```

## Verification Results

- Focused workflow lifecycle tests: passed.
- Focused check lifecycle tests: passed.
- Workflow detail component regression tests: passed.
- Focused workflow/check/secret/config tests: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 58 test files and 320 tests.
- `npm run build`: passed.
- `npm run e2e`: attempted without local Supabase env and the app server failed fast with `Missing Supabase environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.`
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy npm run e2e`: command completed with all 8 Playwright specs skipped because Supabase service credentials are not configured in this worktree.

## Remaining Gaps

- A real authenticated Playwright E2E pass still requires configured `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. The workflow UI regression added in Vitest covers the changed settings/check-edit markup locally, but the full browser suite skipped without service credentials.
- This pass does not add client reassignment in workflow settings because the current settings form does not support client association changes, and adding that would expand the existing product surface.
- Live provider behavior for scheduled checks, Resend, Stripe, and production Supabase Cron remains dependent on configured deployment credentials, as noted in prior launch-readiness audits.
