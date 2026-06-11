# TuesdayOps MVP Sprint Plan

This sprint plan is optimized for Codex-driven development.

## Milestone 0 — Repo Foundation

Goal: create a clean, scalable SaaS foundation.

Deliverables:

- Next.js app
- TypeScript
- Tailwind + shadcn/ui
- Supabase setup
- env template
- app shell
- docs
- lint/typecheck/test scripts

## Milestone 1 — Auth and Agency Workspace

Goal: users can sign up and enter a tenant-scoped workspace.

Deliverables:

- auth flow
- profiles
- agencies
- memberships
- protected routes
- app navigation
- empty dashboard

## Milestone 2 — Clients and Workflows

Goal: agency can add clients and register workflows.

Deliverables:

- clients CRUD
- workflows CRUD
- client list
- workflow list
- workflow detail shell
- secure workflow config form

## Milestone 3 — Endpoint Health Checks

Goal: agency can connect a workflow endpoint and run checks.

Deliverables:

- check config model
- manual check runner
- HTTP request executor
- assertion evaluator
- check run history
- workflow health status

## Milestone 4 — Scheduled Checks and Issues

Goal: TuesdayOps monitors workflows automatically.

Deliverables:

- Inngest/Trigger.dev setup
- scheduled check jobs
- issue creation
- issue dedupe
- issue queue
- resolve/ignore flow
- email alert on high-severity issue

## Milestone 5 — Test Packs

Goal: agency can run synthetic QA tests.

Deliverables:

- test pack CRUD
- test case CRUD
- test runner
- pass/fail results
- test pack summary
- issue creation from failed tests

## Milestone 6 — Reports

Goal: agency can generate proof-of-work report.

Deliverables:

- report generation service
- report preview UI
- report modules
- PDF generation
- white-label branding
- report queue
- email/send action

## Milestone 7 — Billing, Onboarding, and Polish

Goal: MVP is ready for design partners.

Deliverables:

- Stripe checkout/customer portal
- plan limits
- onboarding wizard
- sample data
- dashboard polish
- loading/error/empty states
- deployment docs

## Build rule

Do not start Milestone 4 until Milestones 1–3 are working end-to-end.
