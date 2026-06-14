# Production Ready Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TuesdayOps from a clickable, design-partner MVP toward a production-ready beta while preserving the core loop: Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report.

**Architecture:** Keep provider readiness, workflow onboarding, endpoint safety, reliability checks, and report quality as small domain modules outside React components. Add UI only where it reduces activation friction or improves operational clarity.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage, Inngest, Resend, Stripe, Zod, Playwright, Vitest.

---

## Implementation Order

1. Milestone 9: Production provider readiness
2. Milestone 10: Seamless endpoint/workflow onboarding
3. Milestone 11: Security and tenant hardening
4. Milestone 12: Operational reliability
5. Milestone 13: Report polish
6. Milestone 14: Launch gate and QA handoff

## File Structure

- Create `src/lib/production/readiness.ts`: server-safe provider readiness checks and public health payloads.
- Create `src/lib/production/readiness.test.ts`: readiness grouping, redaction, and launch gate behavior.
- Create `src/app/api/health/route.ts`: public health/readiness route with no secret disclosure.
- Modify `src/components/settings/settings-page.tsx`: show production provider readiness and launch gate status.
- Create `src/lib/workflows/onboarding.ts`: parse direct URLs, cURL commands, OpenAPI JSON, and Postman collection JSON into workflow defaults.
- Create `src/lib/workflows/onboarding.test.ts`: import parser coverage.
- Modify `src/lib/workflows/service.ts`: add `createWorkflowFromImportAction` and share validation/insert logic.
- Modify `src/components/workflows/workflows-page.tsx`: add quick import panel and workflow template guidance.
- Create `e2e/workflow-onboarding.spec.ts`: production-style cURL import flow.
- Create `src/lib/security/endpoint-url.ts`: SSRF/private-network guardrails for monitored endpoints.
- Create `src/lib/security/endpoint-url.test.ts`: public URL allowlist and private URL rejection.
- Modify `src/lib/checks/runner.ts`: reject unsafe production endpoints before network calls.
- Modify `src/lib/reports/aggregation.ts` and `src/lib/reports/pdf.ts`: report-safe sanitization improvements and clearer quality signals.
- Create `src/lib/reports/quality.ts`: report readiness score from source data.
- Create `src/lib/reports/quality.test.ts`: report quality scoring tests.
- Modify `src/components/reports/reports-page.tsx`: show report readiness before export/send.
- Modify `README.md`, `ARCHITECTURE.md`, `API_SPEC.md`, `DATA_MODEL.md`, `SECURITY.md`, `TESTING.md`, `TASKS.md`, `CHANGELOG.md`, and `ROADMAP.md`: document new behavior, env vars, and launch state.
- Create `docs/qa/2026-06-14-production-ready-milestones-qa-handoff.md`: QA report with test results and known gaps.

## Task 1: Production Provider Readiness

- [ ] Write failing readiness tests for required, optional, and launch-blocking provider groups.
- [ ] Implement `src/lib/production/readiness.ts` with no secret values in output.
- [ ] Add `/api/health` returning `{ ok, status, checks }`.
- [ ] Render provider status in Settings.
- [ ] Run `npm run test -- src/lib/production/readiness.test.ts`, then lint/typecheck/test.

## Task 2: Seamless Workflow Onboarding

- [ ] Write failing import parser tests for direct URL, cURL, OpenAPI JSON, and Postman collection JSON.
- [ ] Implement import parsing with deterministic first-request selection and safe defaults.
- [ ] Write failing service/UI coverage for imported workflow defaults.
- [ ] Implement quick import server action and Workflows page panel.
- [ ] Add Playwright coverage for creating a workflow from cURL import.
- [ ] Run focused parser tests, then `npm run e2e -- e2e/workflow-onboarding.spec.ts`.

## Task 3: Security And Tenant Hardening

- [ ] Write failing endpoint URL safety tests for localhost, private IPv4, link-local, metadata IPs, and public HTTPS URLs.
- [ ] Implement endpoint URL validation with development/test private URL allowance.
- [ ] Enforce validation in workflow create/update/import actions and HTTP runner.
- [ ] Run focused security and workflow tests, then lint/typecheck/test.

## Task 4: Operational Reliability

- [ ] Add readiness signals for scheduler, Inngest, email, billing, report storage, and endpoint safety.
- [ ] Add a launch gate summary that distinguishes blocking and advisory checks.
- [ ] Add Settings UI for launch gate state.
- [ ] Run readiness tests and settings E2E smoke.

## Task 5: Report Polish

- [ ] Write failing report quality tests for missing source data, unresolved issues, and ready reports.
- [ ] Implement report quality scoring and source coverage labels.
- [ ] Render report quality in the report preview.
- [ ] Improve PDF/email report lines to include monitoring coverage and open risk count.
- [ ] Run report unit tests and report E2E.

## Task 6: Launch Gate And QA Handoff

- [ ] Update docs for new env vars, endpoint import behavior, safety constraints, and QA commands.
- [ ] Add QA handoff report with milestone-by-milestone test results.
- [ ] Run full verification in order: lint, typecheck, test, build, e2e, audit.
- [ ] Commit, push, open PR, and merge after checks pass.

## Research Notes

- OpenAPI is the right import surface because it standardizes API discovery and operation metadata.
- Postman Collection JSON is the right agency handoff surface because many implementation teams already export executable request collections.
- n8n, Make, Zapier, Supabase Edge Functions, MCP servers, and custom APIs should start as templates inside the existing workflow/check model, not separate native integrations.
- Supabase hardening must keep RLS enabled on exposed tables and account for the 2026 Data API default-grants change by documenting grants alongside migrations.

## Self-Review

- Spec coverage: all six remaining milestones have at least one code or documentation task, and every task strengthens workflow onboarding, check execution, issue/report confidence, or launch readiness.
- Placeholder scan: no task uses TBD/placeholder implementation language.
- Type consistency: new modules use existing `Workflow`, `ReportDraft`, and app env conventions.
