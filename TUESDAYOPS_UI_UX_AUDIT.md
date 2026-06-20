# TuesdayOps UI/UX Audit

Date: 2026-06-17

## Pages Reviewed

- Onboarding: agency workspace setup and activation checklist.
- Overview: portfolio health, setup progress, recent issues, scheduled checks, reliability status.
- Clients: portfolio table, add client modal, edit/archive flow, client detail workflow list.
- Workflows: registry, add workflow modal, workflow detail overview/checks/endpoint/settings.
- Checks: health checks and synthetic test pack surfaces.
- Issues: queue, issue detail, assignment, rerun, reportable, ignore, and resolve flows.
- Reports: report queue, generate form, web preview, report detail, PDF/send actions.
- Global shell/design system: sidebar, cards, badges, buttons, focus states, background, typography tokens.

## UX Issues Found

- Overview used a static greeting and missed a clear reports-due signal.
- Overview did not show recent check runs, making the monitoring loop less immediately visible.
- Client editing happened inside an inline table details panel, which made the row jumpy and easy to confuse with a silent reset.
- Workflow registry truncated endpoint URLs and omitted some expected operational columns.
- Workflow detail did not expose a top-level Run Check action or a compact connection summary on the overview.
- Workflow detail overview did not show linked issues without navigating elsewhere.
- Reports preview looked more like an admin panel than a client-facing proof-of-work document.
- Button and onboarding CTAs mixed hard black with the intended single primary accent.
- Existing E2E selectors were too broad once the clearer Run Check CTA was added.

## Design Changes Made

- Tuned global UI tokens to a neutral background, quieter borders/shadows, and one neutral zinc/charcoal primary accent.
- Updated primary button styling and onboarding/Add workflow selected states to use the shared primary accent.
- Reframed Overview as an operations cockpit with agency context, reports due, and recent check runs.
- Replaced inline client table editing with a focused edit/archive modal.
- Added client initials to portfolio rows for faster scanning.
- Made endpoint URLs wrap in workflow/client views instead of truncating important path details.
- Expanded the workflow registry with environment, frequency, full endpoint path, last check, and row actions.
- Added a top-level Run Check CTA, endpoint summary, report inclusion status, and linked issues to workflow detail.
- Reworked reports preview and report detail into a document-like client-facing surface with cover metadata, scorecard, modules, recommendations, and the retained readiness gate.
- Restored the "Workflow maintenance proof" label inside the premium report preview for both UX clarity and E2E stability.
- Tightened Playwright selectors around Run versus Run Check and made onboarding redirect assertions stable.

## Components Changed/Created

- Created `src/components/clients/edit-client-dialog.tsx`.
- Updated `src/app/globals.css`.
- Updated `src/components/ui/button.tsx`.
- Updated `src/components/app-shell.tsx`.
- Updated `src/components/dashboard/overview-dashboard.tsx`.
- Updated `src/components/dashboard/onboarding-checklist.tsx`.
- Updated `src/components/clients/clients-page.tsx`.
- Updated `src/components/clients/client-detail-page.tsx`.
- Updated `src/components/workflows/workflows-page.tsx`.
- Updated `src/components/workflows/workflow-detail-page.tsx`.
- Updated `src/components/workflows/add-workflow-dialog.tsx`.
- Updated `src/components/reports/reports-page.tsx`.
- Updated `src/components/reports/report-detail-page.tsx`.
- Updated `e2e/drilldowns-feedback.spec.ts`.
- Updated `e2e/reports.spec.ts`.
- Updated `e2e/onboarding-demo.spec.ts`.

## Screens/Flows That Now Pass Acceptance

- Onboarding still guides create agency -> add client -> add workflow -> run first check -> generate report without demo seeding.
- Overview shows active clients, monitored workflows, open issues, pass rate, reports due, activation progress, recent issues, recent check runs, scheduled checks, and operational readiness.
- Clients list remains searchable and now uses a modal edit/archive flow with explicit save/cancel/archive controls.
- Workflows page shows client, type, environment, endpoint, status, last check, pass rate, latency, frequency, report inclusion, and actions.
- Workflow detail clearly shows Run Check, status, endpoint metadata, run history, checks, linked issues, and report inclusion.
- Reports page uses real report/check/issue data and presents preview/export/send as a client-facing document workflow.
- Existing issue assignment, rerun, reportable toggle, resolve note, and ignore flows remain wired through current UI.

## Remaining UX Gaps

- Issue queue could still benefit from a true slide-over detail drawer later; current inline details remain functional and tested.
- Checks/Test Packs page is functional but dense; a later pass could split pack editing into a modal/drawer without changing scope.
- No live browser screenshot artifact was saved in this pass; verification relied on lint/typecheck/unit/build/E2E.
- Report branding remains limited to agency name and current data because richer logo/color asset management is outside this scoped UI pass.

## Commands Run

- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed: 56 files, 306 tests.
- `npm run build` - passed.
- `npm run e2e` - initially exposed selector/pending-state issues after the new Run Check CTA; fixed and reran.
- `npm run e2e` - final pass: 8 passed.

---

## June 19 2026 UX/QA Follow-up

Source reviewed: `TuesdayOps UX/UI & QA Audit (June 19 2026)` attachment, plus current auth, onboarding, overview, clients, workflows, checks, reports, and E2E surfaces.

### UX Issues Addressed

- Auth forms no longer rely on placeholder-only guidance. Sign up, sign in, and reset password now use labelled fields, inline URL-driven feedback, password requirement copy, and show/hide password controls.
- Password mismatch and weak password errors are exposed inline with accessible alerts before server submission.
- Agency slug editing now normalizes user input instead of preserving invalid spaces/special characters, and shows the resulting workspace slug.
- Activation and workflow setup modals now have keyboard-focusable scroll regions, clearer scroll labels, and example-style placeholders instead of fake-looking defaults.
- Dashboard metric descriptions were made plain-English, with accessible help tooltips for each KPI.
- Chart empty states now explain what action will populate them, and chart regions expose richer accessible labels.
- Client rows now show latest report timing and next due date.
- Workflow registry now supports search plus client, environment, and health filters.
- Checks page now separates the basic health-check setup from advanced request body and assertion fields, keeping health checks distinct from synthetic test packs.
- Report preview is labelled as a client-facing article so users and tests can distinguish it from editable narrative fields.
- Report send E2E now accepts the real confirmation dialog before asserting send/fail status.

### Components Changed/Created

- Created `src/components/auth/auth-form-fields.tsx`.
- Created `src/components/auth/sign-up-form.tsx`.
- Created `src/components/auth/sign-in-form.tsx`.
- Created `src/components/auth/reset-password-form.tsx`.
- Updated auth pages under `src/app/(auth)`.
- Updated `src/components/ui/page-feedback.tsx`.
- Updated `src/components/auth/agency-onboarding-form.tsx`.
- Updated `src/components/dashboard/onboarding-checklist.tsx`.
- Updated `src/components/dashboard/overview-dashboard.tsx`.
- Updated `src/components/charts/simple-charts.tsx`.
- Updated `src/components/clients/clients-page.tsx`.
- Updated `src/components/workflows/add-workflow-dialog.tsx`.
- Updated `src/components/workflows/workflows-page.tsx`.
- Updated `src/app/(app)/workflows/page.tsx`.
- Updated `src/components/checks/checks-page.tsx`.
- Updated `src/components/reports/report-detail-page.tsx`.
- Updated `e2e/drilldowns-feedback.spec.ts` and `e2e/reports.spec.ts`.

### Tests Added and Repaired

- Added `src/components/auth/sign-up-form.test.tsx` for password policy, mismatch validation, and reveal/hide behavior.
- Extended `src/components/auth/agency-onboarding-form.test.tsx` for slug normalization.
- Repaired chart/report/check assertion tests that were blocking the full verification gate in the current worktree.
- Repaired E2E selectors/dialog handling for report preview and report sending.

### Verification Results

- Local shell Node was `v20.18.0`, below the repo engine requirement `>=20.19.0`; jsdom/Vitest failed before running tests under that runtime. Final verification used the bundled Codex Node runtime `v24.14.0`.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run lint` - passed.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run typecheck` - passed.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run test` - passed: 70 files, 392 tests.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run test:coverage` - passed: statements 98.81%, branches 95.75%, functions 100%, lines 98.78%.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run build` - passed.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run e2e` - passed: 8 passed.

### Remaining UX Gaps

- The attached audit recommends richer real-time validation across every onboarding field. Current changes add visible, specific validation for the highest-friction auth and slug cases, while the remaining forms still rely mostly on native/server validation.
- Client table search/filtering may need another scaling pass if agencies carry many clients; this pass focused workflow filtering because endpoint health triage is the core operational loop.
- The report narrative review fields are editable-looking but do not yet persist custom narrative edits; persisting custom report copy is useful, but it should be handled as a separate report-editing ticket to avoid broadening scope.
