# TuesdayOps Deployment Readiness

This document is the production handoff checklist for design-partner deployments.

## Runtime

TuesdayOps requires:

```txt
Node.js >=20.19.0
npm >=10
```

The Vite/Vitest toolchain depends on native packages that require Node 20.19 or newer. Use Node 22 or newer on Vercel when possible.

## Vercel

Use the repo defaults:

```txt
Framework preset: Next.js
Install command: npm install
Build command: npm run build
Output: managed by Vercel Next.js adapter
```

Before promoting a deployment, confirm these Vercel settings:

- Production branch is `main`.
- Node.js version is 22.x or newer.
- Preview deployments use the same required server env vars as production.
- `NEXT_PUBLIC_APP_URL` points to the deployed app URL for the target environment.
- Inngest is connected through the Vercel integration or has production `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.

## Required Environment Variables

```txt
NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

WORKFLOW_AUTH_ENCRYPTION_KEY=
SCHEDULER_SECRET=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Billing and analytics variables are wired in later milestones, but should be reserved now:

```txt
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_HOST=https://app.posthog.com

SENTRY_DSN=
```

Never add service-role keys, Resend keys, Stripe keys, scheduler secrets, or workflow auth material to `NEXT_PUBLIC_` variables.

## Supabase Migration Procedure

Before applying migrations:

```bash
supabase migration list --linked
supabase db push --dry-run --linked
```

Apply migrations:

```bash
supabase db push --linked --yes
```

After applying migrations:

```bash
supabase migration list --linked
supabase db lint --linked --fail-on error
supabase db push --dry-run --linked
```

Supabase projects created after April 28, 2026 may not expose new public tables to the Data API automatically. For each new public table, migrations must include:

- RLS enabled.
- Tenant-scoped policies.
- Explicit grants for `authenticated` when app clients need access.
- No exposed tables without RLS.

## Pre-Deploy Verification

Run locally before pushing a milestone branch:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm audit --audit-level=moderate
```

Expected audit state for Milestone 7A:

```txt
found 0 vulnerabilities
```

## Production Smoke Checklist

Run this after the Vercel deployment is ready:

- Sign in with a confirmed agency user.
- Confirm unauthenticated `/overview`, `/clients`, `/workflows`, `/checks`, `/issues`, `/reports`, and `/settings` redirect to sign-in.
- Create an agency through onboarding.
- Create a client.
- Create a workflow with a non-secret test endpoint.
- Run a manual check and confirm check history persists.
- Confirm a failed check creates one active issue and repeated identical failure updates the existing issue.
- Resolve an issue with a report-safe note.
- Create and run a synthetic test pack.
- Generate a monthly report.
- Generate and download a PDF; response content type must be `application/pdf`.
- Trigger `/api/scheduler/run-due-checks` without a scheduler secret and confirm it returns `401`.
- Trigger `/api/scheduler/run-due-checks` with the scheduler secret and confirm due checks are processed.
- Confirm high-severity alert attempts record delivery metadata or a redacted configuration error.
- Confirm Settings billing shows plan usage.
- Confirm missing Stripe config returns a clear Settings error in non-billing environments.
- Confirm Stripe webhook endpoint is configured as `/api/stripe/webhook` in live mode before taking payment.
- Confirm another agency cannot access the first agency's workflow detail URL or report download route.

## Release Notes

For each milestone release, update:

- `CHANGELOG.md`
- `TESTING.md`
- `docs/qa/*-qa-handoff.md`
- `TASKS.md`

Do not mark a milestone complete until the full verification gate and E2E suite pass.
