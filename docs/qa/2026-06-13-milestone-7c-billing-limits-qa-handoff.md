# Milestone 7C Billing and Plan Limits QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-7c-billing-limits`

## Scope

This handoff covers Milestone 7C:

- Stripe Checkout subscription action.
- Stripe Customer Portal action.
- Stripe webhook route.
- Agency billing state.
- Client/workflow plan limits.
- Settings billing usage UI.

The product boundary remains:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report
```

Billing only gates new client/workflow creation; it does not alter existing operational data.

## Implementation Summary

- Installed `stripe@22.2.1`.
- Added Stripe SDK wiring using API version `2026-05-27.dahlia`, verified from the installed SDK typings.
- Added server actions:
  - `createCheckoutSessionAction`
  - `createCustomerPortalSessionAction`
- Added webhook route:

```txt
POST /api/stripe/webhook
```

- Webhook behavior:
  - verifies raw request body with `STRIPE_WEBHOOK_SECRET`
  - handles `checkout.session.completed`
  - handles `customer.subscription.created`
  - handles `customer.subscription.updated`
  - handles `customer.subscription.deleted`
  - writes processed event IDs to `billing_events`
  - updates agency billing fields with the Supabase service role
- Added Settings billing card with:
  - billing status
  - trial end
  - client usage
  - workflow usage
  - checkout button
  - customer portal button
  - safe missing-config errors
- Added plan-limit helpers and enforced limits in:
  - `createClientAction`
  - `createWorkflowAction`

## Database Changes

Migration applied to the linked remote Supabase project:

```txt
20260613174842_billing_and_plan_limits.sql
```

Updated table:

```txt
agencies.billing_subscription_id text
agencies.billing_status text default 'trialing'
agencies.billing_price_id text
agencies.billing_current_period_end timestamptz
agencies.trial_ends_at timestamptz
```

New table:

```txt
billing_events
```

Security notes:

- `billing_events` has RLS enabled.
- `billing_events` is granted to `service_role`, not authenticated users.
- Checkout and portal actions require owner/admin role.
- Webhook updates use the service-role client.
- No Stripe secret or webhook payload is returned to the frontend.

## Verification Evidence

Focused checks passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run e2e -- e2e/billing-limits.spec.ts
supabase db push --dry-run --linked
supabase migration list --linked
supabase db lint --linked --fail-on error
```

Focused unit result:

```txt
16 passed
46 passed
```

Focused E2E result:

```txt
1 passed
```

Full E2E result:

```txt
6 passed
```

Supabase migration apply result:

```txt
Applying migration 20260613174842_billing_and_plan_limits.sql...
Finished supabase db push.
```

Final dry-run result:

```txt
Remote database is up to date.
```

Supabase DB lint result:

```txt
No schema errors found
```

Covered E2E flow:

- confirmed QA user sign-in
- agency onboarding
- Settings billing card shows starter limits
- Customer Portal button is disabled before checkout creates a Stripe customer
- missing Stripe secret returns a clear Settings error
- first starter client can be created
- second starter client is blocked with upgrade copy

## Known Residual Risks

- Live Stripe Checkout requires `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`.
- Live webhook processing requires Stripe Dashboard endpoint configuration and `STRIPE_WEBHOOK_SECRET`.
- Customer Portal requires Stripe Dashboard portal configuration.
- E2E verifies the safe missing-config path, not live card collection.
- The current single configured Stripe price maps to the `growth` plan.
- Supabase CLI verification should be run sequentially; parallel migration/lint commands can exhaust temporary login attempts.

## QA Recommendation

QA should verify:

- Settings shows current plan, billing status, and usage.
- Starter agencies can create one active client and three workflows.
- Creating beyond the limit shows upgrade copy and preserves existing rows.
- A real Stripe test checkout updates the agency after `checkout.session.completed` and subscription webhooks.
- Another agency cannot observe or mutate billing state through normal app flows.
