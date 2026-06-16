# Design Partner Readiness Phases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the remaining non-ignored TuesdayOps readiness phases while keeping the MVP loop focused on agency/client/workflow/check/issue/report proof.

**Architecture:** Add missing product behavior through existing Next.js server actions, API routes, Supabase-backed service modules, and small UI components. Preserve tenant boundaries, report-safe output, and idempotent background behavior. Avoid ignored/deferred areas: Slack alerts, PostHog analytics, brand logo uploads, client portal, and browser synthetic checks.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, Supabase Cron/Vault, Resend, Stripe, Zod, Vitest, Playwright, lightweight SVG charts.

---

## Scope

Implement:

1. CRUD cleanup for workflows, checks, test packs, and test cases.
2. Public/manual run logging API.
3. Lightweight model/prompt comparison.
4. Dashboard charts using local SVG components rather than adding a new dependency.
5. Monthly report draft automation.
6. OpenAPI import polish for YAML and safe URL import.
7. Public logged-out marketing landing page with authenticated dashboard redirect.
8. Documentation alignment.
9. QA follow-up: client drill-down, controlled report-send/PDF/Stripe verification hooks or documented safe verification steps.

Do not implement:

- Slack alerts.
- PostHog event tracking.
- Brand logo upload/custom logo UI.
- Client portal/public report links.
- Browser synthetic checks.

## File Structure

- Modify: `src/lib/workflows/service.ts` for workflow archive and import URL/YAML support.
- Modify: `src/components/workflows/workflow-detail-page.tsx` and `src/components/workflows/workflow-import-form.tsx` for actions and inputs.
- Modify: `src/lib/checks/service.ts` and `src/components/checks/checks-page.tsx` for check disable/archive actions.
- Modify: `src/lib/test-packs/service.ts` and `src/components/checks/checks-page.tsx` for edit/delete/archive test pack/case actions.
- Create: `src/lib/run-logs/api-keys.ts`, `src/lib/run-logs/service.ts`, `src/app/api/public/run-log/route.ts`, and tests for public run logging.
- Modify: `supabase/migrations/*` by adding one new migration for run-log API keys and report automation fields.
- Modify: `src/lib/reports/aggregation.ts`, `src/lib/reports/pdf.ts`, `src/components/reports/report-detail-page.tsx` for model/prompt comparison reporting.
- Create: `src/components/charts/simple-charts.tsx` and add charts to Overview, Client Detail, and Workflow Detail.
- Create: `src/lib/reports/scheduler.ts` and `src/app/api/scheduler/run-monthly-reports/route.ts` for idempotent report draft automation.
- Modify: `src/app/page.tsx` and create `src/components/marketing/landing-page.tsx`.
- Modify: `README.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_SPEC.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, `ROADMAP.md`, `TECH_STACK.md`, `DEPLOYMENT.md`, `TESTING.md`, and `CHANGELOG.md`.

## Task 1: CRUD Cleanup

- [ ] **Step 1: Write failing service tests**

Add tests proving workflow archive, check disable, test-pack update/archive, and test-case update/archive are tenant-scoped and report-safe.

Run:

```bash
npm run test -- src/lib/workflows/service.test.ts src/lib/checks/service.test.ts src/lib/test-packs/service.test.ts
```

Expected: FAIL because the actions/helpers do not exist yet.

- [ ] **Step 2: Implement service actions**

Implement archive/disable/update actions with Zod validation, `agency_id` filters, `assertMutationTouchedRow`, revalidation, redirects, and audit events.

- [ ] **Step 3: Wire UI controls**

Add confirmation prompts and disabled/archive controls in workflow/check/test-pack surfaces without hard-deleting historical runs.

- [ ] **Step 4: Verify**

Run focused unit tests, then E2E for workflow/check/test-pack paths.

## Task 2: Public Run Logging API

- [ ] **Step 1: Write failing API/key tests**

Create tests for API key hashing, missing/invalid key rejection, tenant-scoped workflow lookup, valid run-log insertion, and failed log issue creation.

Run:

```bash
npm run test -- src/lib/run-logs src/app/api/public/run-log/route.test.ts
```

Expected: FAIL because modules and route do not exist.

- [ ] **Step 2: Add schema migration**

Add `workflow_api_keys` with hashed key storage and optional `expires_at`, plus indexes. Keep plaintext key visible only once during generation.

- [ ] **Step 3: Implement API route**

Implement `POST /api/public/run-log` with `Authorization: Bearer <key>`, Zod payload validation, status/latency/model/prompt/cost fields, redacted error summaries, and issue creation on failed/degraded logs.

- [ ] **Step 4: Add key UI**

Add workflow detail controls to create/rotate/revoke API keys with clear copy that keys are shown once.

- [ ] **Step 5: Verify**

Run focused tests plus production smoke route rejection checks.

## Task 3: Model/Prompt Comparison MVP

- [ ] **Step 1: Write failing aggregation tests**

Add tests proving report drafts include a "Model/prompt changes tested" item when check/test/run-log data contains model or prompt version metadata.

- [ ] **Step 2: Add comparison helpers**

Add a small service that groups runs by `model` and `prompt_version`, comparing pass rate, latency, and cost estimate.

- [ ] **Step 3: Render comparison**

Add workflow detail and report preview sections for change validation. Keep copy simple and avoid eval-platform language.

- [ ] **Step 4: Verify**

Run report and workflow focused tests.

## Task 4: Dashboard Charts

- [ ] **Step 1: Write chart-data tests**

Add pure helper tests for pass-rate trend, checks-over-time, and issues-by-severity series.

- [ ] **Step 2: Implement simple SVG chart components**

Create accessible, responsive SVG line/bar components with labels and no new chart dependency.

- [ ] **Step 3: Add charts to dashboards**

Add charts to Overview, Client Detail, and Workflow Detail, keeping tables as the primary work surface.

- [ ] **Step 4: Verify rendered layout**

Run Playwright visual/interaction checks on desktop and mobile.

## Task 5: Report Automation Schedules

- [ ] **Step 1: Write failing scheduler tests**

Add tests for due-client selection, idempotent monthly draft generation, blocked readiness preservation, and duplicate prevention.

- [ ] **Step 2: Add data model fields**

Add client/report automation fields needed for next report due date and automation state.

- [ ] **Step 3: Implement scheduler route**

Add protected `POST /api/scheduler/run-monthly-reports`, sharing scheduler auth/rate-limit style with due checks.

- [ ] **Step 4: Add UI state**

Show next report due and last generated report on Reports/Client surfaces. Do not auto-send.

- [ ] **Step 5: Verify**

Run unit tests and route tests.

## Task 6: OpenAPI Import Polish

- [ ] **Step 1: Write failing parser tests**

Add tests for YAML OpenAPI text and safe OpenAPI URL imports.

- [ ] **Step 2: Implement YAML parsing**

Implement a narrow YAML parser for common OpenAPI maps/lists/scalars or add a justified lightweight dependency if unavoidable.

- [ ] **Step 3: Implement safe URL fetch**

Fetch only public safe URLs, cap response size, require JSON/YAML content, and reuse endpoint safety checks.

- [ ] **Step 4: Verify**

Run import parser tests and workflow onboarding E2E.

## Task 7: Public Landing Page

- [ ] **Step 1: Write route tests**

Add tests proving logged-out `/` renders marketing copy and authenticated users still reach the dashboard.

- [ ] **Step 2: Implement landing page**

Create a restrained public page focused on AI agency workflow maintenance with sign-up/sign-in CTAs and no unsupported claims.

- [ ] **Step 3: Verify**

Run route tests and browser smoke for logged-out and logged-in states.

## Task 8: Documentation Alignment

- [ ] **Step 1: Update milestone docs**

Add Milestones 18-25 covering this work and mark ignored items deferred/out of scope.

- [ ] **Step 2: Update system docs**

Update architecture, API, data model, deployment, testing, roadmap, tech stack, README, and changelog.

- [ ] **Step 3: Verify docs mention no stale must-have dependency choices**

Search docs for old claims that conflict with Supabase Cron, intentionally skipped analytics, and no client portal.

## Task 9: QA Follow-up Verification

- [ ] **Step 1: Reproduce/fix client drill-down**

Run a browser/Playwright check for Clients table row links and direct client URL.

- [ ] **Step 2: Controlled provider checks**

Run safe report-send, PDF download, and Stripe test-mode checkout/portal checks only when configured with safe provider credentials. If credentials are unavailable, document exact missing access/tooling.

- [ ] **Step 3: Full verification gate**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run e2e
npm run smoke:production
npm audit --audit-level=moderate
```

Expected: all local gates pass; production/provider checks either pass or have explicit access/tooling notes.

