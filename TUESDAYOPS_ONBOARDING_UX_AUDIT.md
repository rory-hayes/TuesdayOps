# TuesdayOps Onboarding UX Audit

Date: 2026-06-18

Scope: Core Blocker 9 - Onboarding, Empty States, and Core-Loop UX.

## Pages Reviewed

- Onboarding: agency workspace creation.
- Overview: activation checklist, next-best-action guide, portfolio health, reports due, recent issues, recent check runs, scheduled checks, and operations readiness.
- Clients: empty portfolio state, new client modal, save/cancel behavior, search, portfolio table.
- Workflows: empty registry, Add workflow modal, quick import/manual setup, endpoint URL display, manual first health-check setup.
- Checks: health-check/test-pack creation and empty state copy.
- Issues: queue filters, inline detail/actions, resolution-note form.
- Reports: generation form, queue empty state, readiness gate, report preview and detail document surfaces.
- Global UI primitives: buttons, form submission states, feedback toasts, focus-visible styling, cards, badges, validated form behavior.

## UX Issues Found

- Agency onboarding disabled native browser validation but did not show an inline field-level error before submitting an empty workspace name.
- The manual Add workflow form was not exposed as a named form region and relied on server redirects or native browser behavior instead of visible inline validation for missing first-run fields.
- New client creation had save/cancel controls, but its `noValidate` form could still feel silent on invalid required fields before the server action ran.
- Wrapped label markup could let inline validation text pollute accessible field names unless controls keep stable explicit labels.
- The existing Overview and report surfaces already covered the required portfolio metrics, next-best-action progress, recent issues, recent check runs, report readiness, and document-like preview from the previous UI pass.

## Design Changes Made

- Added a small shared `ValidatedForm` client component for first-run forms.
- Invalid submissions now show specific inline field errors, prevent server-action submission, mark fields with `aria-invalid`, connect errors through `aria-describedby`, and focus the first invalid field.
- Kept the server-side Zod validation and redirect feedback as the authoritative privileged boundary.
- Added stable `aria-label` values to wrapped-label controls so accessible names remain clean after inline errors appear.
- Applied the validated form behavior to agency onboarding, new client creation, and manual workflow setup.
- Named the manual workflow setup form for screen reader and test targeting.

## Components Changed

- `src/components/ui/validated-form.tsx`
- `src/components/auth/agency-onboarding-form.tsx`
- `src/components/clients/new-client-dialog.tsx`
- `src/components/workflows/add-workflow-dialog.tsx`

## Tests Added

- `src/components/auth/agency-onboarding-form.test.tsx`
- `src/components/workflows/add-workflow-dialog.test.tsx`

## Flows That Pass

- Create agency: empty agency name now shows `Agency name is required.` inline before submission.
- Add workflow manually: selecting bearer auth without a token now shows `Bearer token is required.` inline before submission.
- Add client: invalid required fields now use the same inline validation pattern while preserving explicit cancel/save controls.
- First-run core loop remains agency -> client -> workflow -> check run -> report, with no demo-only UI added.

## Commands Run

- `npm install` - completed with Node engine warnings under the shell Node `20.18.0`; repo requires `>=20.19.0`.
- `npm install --no-save @rolldown/binding-darwin-arm64@1.0.3` - installed the lockfile-listed optional native binding so local Vitest could start.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run lint` - passed.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run typecheck` - passed.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run test -- src/components/auth/agency-onboarding-form.test.tsx src/components/workflows/add-workflow-dialog.test.tsx` - passed, 59 files and 312 tests.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run test` - passed, 59 files and 312 tests.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run build` - passed.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npm run e2e` - blocked at dev-server startup because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are not configured in this worktree.
- `PATH="/Users/rory/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="local-placeholder" npm run e2e` - completed with 8 skipped specs because Supabase service credentials are absent.

## Visual and Manual Verification Notes

- Started the local dev server on port `3001` with placeholder public Supabase env because port `3000` was already in use and no `.env.local` is present.
- Browser/IAB desktop check at `http://127.0.0.1:3001/`: page title was `TuesdayOps`; public product screen rendered meaningful content; no framework overlay; no browser console errors or warnings were captured.
- Browser/IAB tablet check at `768x1024`: hero, primary CTA, metrics, and product preview stacked without overlap or clipped text; no framework overlay; no browser console errors or warnings were captured.
- Browser/IAB protected-route check at `/onboarding`: unauthenticated access redirected to `/sign-in`; sign-in page rendered; no framework overlay; no browser console errors or warnings were captured.
- Authenticated onboarding/client/workflow screenshots were not available in this worktree because Supabase credentials are missing; the changed invalid-form behavior is covered by jsdom component tests.

## Remaining UX Gaps

- Checks/Test Packs remains dense; a later drawer/modal pass could improve scan speed without expanding scope.
- Issue details are still inline rather than a true side drawer; this is functional and keeps the current MVP scope.
- Full authenticated browser QA still needs a configured Supabase QA environment.
