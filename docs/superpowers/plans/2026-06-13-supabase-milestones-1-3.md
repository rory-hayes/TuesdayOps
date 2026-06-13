# Supabase Milestones 1-3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the clickable TuesdayOps shell into a usable authenticated SaaS foundation with Supabase-backed agency workspaces, client/workflow persistence, and manual endpoint health checks.

**Architecture:** Use Supabase Auth with `@supabase/ssr` cookie clients in Next.js App Router. Store tenant data in Supabase Postgres with `agency_id` on tenant-owned rows and RLS policies based on authenticated membership. Keep check execution and assertions in server-side service modules so UI components never receive or expose raw secrets.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Auth/Postgres/RLS, `@supabase/ssr`, `@supabase/supabase-js`, Zod, Vitest, server actions, route handlers.

---

## Security Rules For This Plan

- Do not commit `.env.local`, database passwords, secret keys, service role keys, or workflow auth config.
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only for browser-safe client setup.
- Use `SUPABASE_SECRET_KEY` only in server-only modules if a privileged operation is required.
- Never return encrypted or raw workflow auth config to client components.
- Enable RLS on every public tenant-owned table before relying on the Data API.
- Never use user-editable metadata for authorization decisions.

## File Map

- Create `supabase/config.toml`, `supabase/migrations/*_milestones_1_3.sql`: local Supabase project configuration and schema/RLS migration.
- Modify `.env.example` and create `.env.local` manually outside Git if local runtime verification needs real keys.
- Create `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`: SSR Supabase clients and session refresh helper.
- Create `src/proxy.ts`: Next proxy for Supabase session refresh.
- Create `src/lib/env.ts`: server-side env access helpers that avoid initializing clients at module scope.
- Create `src/lib/db/types.ts`: database row/insert/update types for Milestones 1-3.
- Create `src/lib/auth/*`: current user, workspace, and sign-in/sign-up/sign-out actions.
- Create `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`: auth pages.
- Create `src/app/onboarding/page.tsx`: agency workspace onboarding.
- Modify `src/app/(app)/layout.tsx`: protect app routes and load active agency context.
- Create `src/lib/clients/*`, `src/lib/workflows/*`, `src/lib/checks/*`: validation schemas, services, server actions, and tests.
- Modify `src/components/clients/clients-page.tsx`, `src/components/workflows/workflows-page.tsx`, `src/components/checks/checks-page.tsx`, `src/components/dashboard/overview-dashboard.tsx`: render persisted data with fallbacks and action forms.
- Modify `README.md`, `TASKS.md`, `CHANGELOG.md`, `DATA_MODEL.md`, `API_SPEC.md`: document implementation status and local setup.

## Task 1: Install Supabase And Validation Dependencies

- [ ] Add runtime dependencies:

```bash
npm install @supabase/supabase-js @supabase/ssr zod
```

- [ ] Verify scripts still run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

## Task 2: Add Migration For Milestones 1-3

- [ ] Use Supabase CLI to create a migration:

```bash
supabase init
supabase migration new milestones_1_3
```

- [ ] Fill the migration with tables, indexes, triggers, and RLS policies for:

```txt
agencies
profiles
memberships
clients
workflows
checks
check_runs
issues
```

- [ ] Include RLS policies that require membership in the row agency.

- [ ] Include a trigger on `auth.users` that creates a profile row.

- [ ] Add indexes on `agency_id`, `client_id`, `workflow_id`, and policy lookup columns.

## Task 3: Add Supabase SSR Clients And Auth Pages

- [ ] Create `src/lib/env.ts` with helpers for required public env and optional server secret env.

- [ ] Create Supabase browser and server clients using `@supabase/ssr`.

- [ ] Create `src/proxy.ts` to refresh sessions before protected server component rendering.

- [ ] Create sign-up and sign-in pages with server actions.

- [ ] Create sign-out action and header control.

- [ ] Protect app routes by redirecting unauthenticated users to `/sign-in`.

## Task 4: Add Agency Workspace Onboarding

- [ ] Add server action to create an agency and owner membership for the current user.

- [ ] Add `/onboarding` page for agency name and branding color.

- [ ] Redirect authenticated users with no agency to onboarding.

- [ ] Redirect users with an agency to the dashboard.

- [ ] Add unit tests for slug generation and workspace validation.

## Task 5: Add Client Persistence

- [ ] Add Zod schemas for client create/update/archive.

- [ ] Add server-side client service functions:

```ts
listClients(agencyId)
createClient(agencyId, input)
updateClient(agencyId, clientId, input)
archiveClient(agencyId, clientId)
```

- [ ] Add server actions and forms for creating clients.

- [ ] Update clients page and dashboard to read Supabase data when authenticated.

## Task 6: Add Workflow Persistence With Secret-Safe Auth Config

- [ ] Add Zod schemas for workflow create/update.

- [ ] Store workflow auth config server-side only in `encrypted_auth_config`.

- [ ] For this milestone, persist a redacted auth config envelope. Do not display secrets in the UI.

- [ ] Add workflow create form and list persisted workflows by agency.

## Task 7: Add Check Schema, Assertion Engine, And HTTP Runner

- [ ] Write failing tests for assertions:

```txt
status_code
latency_under
field_exists
equals
not_contains
```

- [ ] Implement assertion evaluation in `src/lib/checks/assertions.ts`.

- [ ] Implement server-side HTTP runner with timeout support, GET/POST, status code, latency, response summary, and safe error capture.

- [ ] Save manual check runs in `check_runs`.

- [ ] Create or update an issue when a run is failed/degraded.

## Task 8: Add Manual Run Check UI

- [ ] Add check create form for a workflow.

- [ ] Add "Run check" action for a workflow/check.

- [ ] Show latest result and run history on the checks page.

- [ ] Keep raw response bodies out of UI; show response summaries and assertion results only.

## Task 9: Verify And Commit

- [ ] Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

- [ ] If the real Supabase project can be reached safely, apply migrations and verify tables with a non-secret result query.

- [ ] Commit with:

```bash
git add .
git commit -m "feat: implement Supabase milestones 1-3"
```

- [ ] Push and merge to `main` when verified.

## Notes From Current Supabase Docs

- Supabase SSR requires cookie-backed clients through `@supabase/ssr`.
- Current docs use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for client-safe configuration.
- Publishable keys are for browser/client-side operations; secret keys are server-side only.
- RLS must be enabled before public schema tables are safely reachable through publishable-key access.
- The `/rest/v1/` OpenAPI schema endpoint is no longer accessible via anon/publishable key after the March 2026 security change; do not depend on it for app behavior.
