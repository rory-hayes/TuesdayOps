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
- Supabase Cron is enabled, with Vault secrets named `tuesdayops_app_url` and `tuesdayops_scheduler_secret`.
- `/api/health` returns a `ready` status before public launch.

## Required Environment Variables

```txt
NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

WORKFLOW_AUTH_ENCRYPTION_KEY=
ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=
SCHEDULER_SECRET=

SUPABASE_CRON_ENABLED=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Billing, observability, and reserved analytics variables:

```txt
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.25
```

Never add service-role keys, Resend keys, Stripe keys, scheduler secrets, or workflow auth material to `NEXT_PUBLIC_` variables.
`NEXT_PUBLIC_SENTRY_DSN` is intentionally public and is required for browser-side error capture. Leave `SENTRY_EXAMPLE_ENABLED` unset except during a temporary deployed Sentry smoke test.
Leave `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS` unset in production. It exists only for local/private test environments that intentionally monitor localhost or private-network endpoints.

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

The code hardening migration adds `audit_events`, additional query indexes, and the service-role-only `delete_old_check_runs(older_than, max_delete)` retention helper. After applying it, confirm:

- `audit_events` has RLS enabled.
- `authenticated` can only `select` tenant-scoped audit rows.
- `service_role` can insert audit rows and execute `delete_old_check_runs`.
- No `security definer` helper is exposed for this retention path.

The Supabase Cron scheduler migration adds:

- `pg_net` and `pg_cron` extension setup.
- `supabase_vault` setup for encrypted scheduler material.
- `public.trigger_due_check_sweep()`, which calls the protected Vercel scheduler route.
- `public.configure_due_check_cron()`, which schedules `tuesdayops-run-due-checks` every five minutes.

Before marking scheduling ready, add these Supabase Vault secrets:

```sql
select vault.create_secret('https://tuesday-ops.vercel.app', 'tuesdayops_app_url');
select vault.create_secret('<same value as SCHEDULER_SECRET>', 'tuesdayops_scheduler_secret');
select public.configure_due_check_cron();
```

Then set `SUPABASE_CRON_ENABLED=true` in Vercel production env and redeploy.

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
- Confirm the Supabase Cron job `tuesdayops-run-due-checks` is active and its latest run has no error.
- Trigger `/api/scheduler/run-due-checks` with the scheduler secret and confirm due checks are processed.
- Confirm high-severity alert attempts record delivery metadata or a redacted configuration error.
- Confirm scheduler trigger abuse protection returns `429` after repeated calls from the same source.
- Confirm Settings billing shows plan usage.
- Confirm missing Stripe config returns a clear Settings error in non-billing environments.
- Confirm Stripe webhook endpoint is configured as `/api/stripe/webhook` in live mode before taking payment.
- Open `/api/health` and confirm `launchReady` is `true`.
- Confirm Settings shows Operational reliability as `ready` or that remaining attention items are accepted for the design partner.
- Import a workflow from a cURL command and confirm it creates a normal workflow plus first health check.
- Attempt to add a localhost/private endpoint in production and confirm it is blocked.
- Attempt a workflow endpoint that returns a redirect and confirm the check run fails without following the redirect.
- Confirm another agency cannot access the first agency's workflow detail URL or report download route.
- Confirm Settings does not show the internal Production readiness launch-gate panel.

## Automated Smoke

The repository includes:

- `.github/workflows/ci.yml` for lint, typecheck, unit tests, and production build.
- `.github/workflows/production-smoke.yml` for scheduled/manual runs of the shared production smoke suite.
- `npm run smoke:production` for an operator/QA smoke check against the deployed app URL.

The production smoke command checks public readiness without exposing secrets, confirms temporary Sentry example routes are not exposed in production, verifies authenticated app routes redirect to sign-in, confirms unsigned Stripe webhook requests are rejected, verifies the scheduler route rejects unauthenticated requests, and confirms required browser security headers are present with framework disclosure disabled. It targets `https://tuesday-ops.vercel.app` by default; set `PRODUCTION_SMOKE_URL=https://your-deployment.example.com` to test another deployment.

The GitHub production smoke workflow runs the same shared production smoke command on a schedule and by manual dispatch. PostHog keys are optional while analytics is intentionally skipped.

## Release Notes

For each milestone release, update:

- `CHANGELOG.md`
- `TESTING.md`
- `docs/qa/*-qa-handoff.md`
- `TASKS.md`

Do not mark a milestone complete until the full verification gate and E2E suite pass.
