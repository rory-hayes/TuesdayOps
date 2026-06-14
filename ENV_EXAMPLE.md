# Environment Variables Example

Create a `.env.local` file using this shape.

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

WORKFLOW_AUTH_ENCRYPTION_KEY=
ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=
SCHEDULER_SECRET=

INNGEST_DEV=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

SENTRY_DSN=
```

`ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true` should only be used for local development or private test environments. Leave it unset in production so workflow checks cannot call localhost, private RFC1918 ranges, link-local addresses, or metadata endpoints.

Do not commit real `.env.local` files.
