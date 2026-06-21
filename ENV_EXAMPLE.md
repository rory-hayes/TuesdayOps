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

SUPABASE_CRON_ENABLED=

RESEND_API_KEY=
RESEND_FROM_EMAIL="MaintainFlow Reports <reports@maintainflow.io>"
RESEND_VERIFIED_SENDER_DOMAIN=maintainflow.io

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER=
STRIPE_PRICE_ID_GROWTH=
STRIPE_PRICE_ID_SCALE=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.25
SENTRY_EXAMPLE_ENABLED=
```

`ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true` should only be used for local development or private test environments. Leave it unset in production so workflow checks cannot call localhost, private RFC1918 ranges, link-local addresses, or metadata endpoints.

Do not commit real `.env.local` files.

`SENTRY_EXAMPLE_ENABLED=true` should only be used temporarily when testing Sentry in a deployed environment. The Sentry example page is available automatically in local development.

PostHog env values are reserved for the analytics milestone. They can stay empty while PostHog is intentionally skipped; Sentry remains the required observability provider.

## Google OAuth

Google sign-in uses Supabase Auth and does not require Google secrets in this app's environment variables.

Provider setup:

- Enable Google in Supabase Auth providers.
- Store the Google OAuth client ID and secret in Supabase provider settings.
- Add the Supabase provider callback URL to Google Authorized Redirect URIs, for example `https://<project-ref>.supabase.co/auth/v1/callback`.
- Add `${NEXT_PUBLIC_APP_URL}/auth/callback` to the Supabase Auth redirect allowlist for each deployed environment.
