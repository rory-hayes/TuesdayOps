# TuesdayOps Tech Stack

## Recommended MVP stack

| Layer | Tool | Reason |
|---|---|---|
| Frontend | Next.js + TypeScript | Fast production SaaS development |
| UI | Tailwind CSS + shadcn/ui | Clean, fast, customizable UI |
| DB/Auth/Storage | Supabase | Auth, Postgres, RLS, storage |
| Jobs | Inngest or Trigger.dev | Scheduled checks, retries, background jobs |
| Hosting | Vercel | Fast deployments and previews |
| Email | Resend | Alerts and reports |
| Billing | Stripe | Subscriptions and customer portal |
| Analytics | PostHog | Product analytics and activation funnels |
| Error tracking | Sentry | App and job error visibility |
| Forms | React Hook Form + Zod | Form handling and validation |
| Charts | Recharts or Tremor | Dashboard charts |
| PDF reports | React PDF or Playwright/Puppeteer | Report generation |
| Icons | Lucide React | Consistent modern icons |

## Build choices

### Use Supabase Auth initially

Do not add Clerk/Auth0 unless Supabase Auth becomes a blocker.

### Use Supabase Postgres

The data model is relational and tenant-scoped. Postgres is the right choice.

### Use Inngest or Trigger.dev

Background jobs are central to the product. Use a managed job system instead of building custom cron/retry infrastructure.

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
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
WORKFLOW_AUTH_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
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
