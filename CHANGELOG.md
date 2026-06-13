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
- Added repo-level Vercel Next.js build configuration and configured preview/production runtime env vars in Vercel.
- Applied the Milestones 1-3 Supabase migration to the remote project and completed authenticated E2E against remote Supabase.
- Added issue fingerprints, last-seen timestamps, and occurrence counts for active issue dedupe.
- Added failed/degraded check issue creation, severity mapping, repeat-failure updates, and issue queue assign/resolve/ignore actions.
- Completed authenticated E2E for the Milestone 4 issue-management slice against remote Supabase.
- Added Inngest scheduled check functions, a protected scheduler trigger route, server-only Supabase admin client wiring, scheduled run metadata, and duplicate scheduled-window protection.
- Added reusable Playwright E2E coverage for scheduled health checks creating runs and issues without duplicate immediate reruns.
- Added Resend-backed high/critical issue alert delivery with redacted email copy, delivery metadata, and E2E coverage for alert attempt recording.
- Added tenant-scoped synthetic test packs, test cases, manual pack runs, test-run persistence, synthetic failure issue creation, and E2E coverage for the Milestone 5 test-pack loop.
- Added monthly report generation, report items, report preview, private PDF storage/download, report email send attempts, and E2E coverage for the Milestone 6 reporting loop.
- Added Milestone 7A launch-readiness hardening: Node runtime floor, Vercel/Supabase/smoke deployment checklist, expanded env templates, Vite 8 test tooling, and a clean moderate-level npm audit.
- Added Milestone 7B onboarding/demo mode with an activation checklist, tenant-scoped sample data seeding, sample-data migration, unit coverage, and E2E coverage.
