# TuesdayOps Tech Stack

## Recommended MVP stack

| Layer | Tool | Reason |
|---|---|---|
| Frontend | Next.js + TypeScript | Fast production SaaS development |
| UI | Tailwind CSS + shadcn/ui | Clean, fast, customizable UI |
| DB/Auth/Storage | Supabase | Auth, Postgres, RLS, storage |
| Jobs | Supabase Cron/Vault + protected Next.js routes | Scheduled checks and report draft automation without adding another provider |
| Hosting | Vercel | Fast deployments and previews |
| Email | Resend | Alerts and reports |
| Billing | Stripe | Subscriptions and customer portal |
| Analytics | Deferred | PostHog is intentionally skipped for the current design-partner plan |
| Error tracking | Sentry | App and job error visibility |
| Forms | Server actions + Zod | Form handling and validation |
| Charts | Lightweight SVG components | Dashboard charts without a new dependency |
| PDF reports | Server-side PDF helper | Report generation |
| Icons | Heroicons + Lucide where already used | Consistent modern icons |

Runtime requirement:

```txt
Node.js >=20.19.0
```

Use Node 22 or newer for Vercel production deployments when possible.

## Build choices

### Use Supabase Auth initially

Do not add Clerk/Auth0 unless Supabase Auth becomes a blocker.

### Use Supabase Postgres

The data model is relational and tenant-scoped. Postgres is the right choice.

### Use Supabase Cron/Vault scheduler

Scheduled checks and monthly report draft generation use Supabase Cron/Vault to call protected Next.js scheduler routes with `SCHEDULER_SECRET`.

### Use Stripe Billing

Do not build billing logic. Use Stripe Checkout and Customer Portal.

### Use Resend

Use Resend for:

- issue alerts
- report ready emails
- invite emails
- monthly report delivery

## Environment variables

Expected MVP env vars:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SCHEDULER_SECRET=
SUPABASE_CRON_ENABLED=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER=
STRIPE_PRICE_ID_GROWTH=
STRIPE_PRICE_ID_SCALE=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=
WORKFLOW_AUTH_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
```

Optional analytics envs for a later PostHog pass:

```txt
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Package structure recommendation

```txt
tuesdayops/
  app/
  components/
  lib/
    auth/
    db/
    checks/
    issues/
    reports/
    billing/
    alerts/
    encryption/
  inngest/
  tests/
  docs/
```

For a larger monorepo later:

```txt
apps/web
apps/worker
packages/db
packages/ui
packages/domain
packages/reporting
packages/integrations
```

Start simple unless scale requires monorepo separation.
