# Changelog

Track meaningful product and engineering changes here.

## Unreleased

- Initial Codex planning pack created.
- Added the MVP foundation shell with Next.js, TypeScript, Tailwind CSS, seeded TuesdayOps domain data, core product screens, and domain summary tests.
- Added Supabase SSR auth wiring, protected app routes, sign-in/sign-up screens, sign-out, and agency onboarding.
- Added Supabase migration for agency workspaces, tenant-scoped clients/workflows/checks/check runs/issues, RLS policies, and onboarding RPC.
- Replaced protected app seed-data reads with tenant-scoped Supabase loaders and empty states.
- Added client create/update/archive server actions and searchable client portfolio UI.
- Added workflow creation, encrypted auth config handling, workflow detail shell, check creation, manual HTTP check runner, assertion engine, and check run history.
- Added unit coverage for slug generation and endpoint assertion evaluation.
