# Milestone 4 Alerts QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-4-alerts`

## Scope

This handoff covers T4.4 Alerts:

- Resend integration.
- High/critical issue email alert behavior.
- Alert-safe copy and redaction.
- Alert delivery metadata on issues.

The product loop under test is:

```txt
Check Run -> Issue -> High-Severity Alert
```

## Implementation Summary

- Added `resend` SDK integration.
- Added alert policy:
  - send only for newly created high or critical issues
  - do not send on repeat deduped issue updates
  - do not send medium/low severity alerts
- Added alert-safe email copy builder.
- Added redaction for:
  - email addresses
  - bearer/basic auth material
  - token, secret, password, and API key key-value patterns
- Added issue alert delivery service.
- Wired alert attempts into new issue creation.
- Alert failures do not fail check execution or issue creation.
- Added issue delivery metadata:
  - `alert_sent_at`
  - `alert_delivery_id`
  - `alert_error`
  - `alert_last_attempt_at`

## Database Changes

Migration applied to the linked remote Supabase project:

```txt
20260613160757_issue_alert_fields.sql
```

New fields on `issues`:

```txt
alert_sent_at timestamptz
alert_delivery_id text
alert_error text
alert_last_attempt_at timestamptz
```

## Verification Evidence

### Static and Unit Checks

Focused checks passed:

```bash
npm run test -- src/lib/alerts
npm run typecheck
```

Alert unit coverage verifies:

- high and critical new issues are alert-eligible
- medium issues are not alert-eligible
- repeat deduped issues are not alert-eligible
- secret-like material is redacted before email copy is built
- the delivery service calls the email transport and records delivery metadata

### Supabase Verification

Passed:

```bash
supabase db push --dry-run --linked
supabase db push --linked --yes
supabase db lint --linked --fail-on error
supabase migration list --linked
```

Remote migration history includes:

```txt
20260613111357
20260613144638
20260613153450
20260613160757
```

Supabase DB lint result:

```txt
No schema errors found
```

### E2E Verification

Passed:

```bash
npm run e2e -- e2e/alerts.spec.ts
```

Result:

```txt
1 passed (8.8s)
```

Covered flow:

- confirmed QA user sign-in
- onboarding
- client creation
- workflow creation
- scheduled runner trigger
- high-severity issue creation from unreachable endpoint
- alert attempt recorded on issue
- missing Resend config recorded as `alert_error`
- check execution did not fail because alert delivery was unavailable

## Environment State

Missing locally and in Vercel at test time:

```txt
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Because these are not configured, live Resend delivery was not executed. The code path is unit-tested with a fake email transport, and E2E verified that missing configuration is recorded safely on the issue without breaking check execution.

## Known Residual Risks

- Live Resend delivery still needs QA once `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured.
- Vercel production and preview envs do not yet contain Resend keys.
- Alert emails currently go to the client `report_recipient_email`. There is no separate alert-recipient preference UI yet.
- Alert attempts are stored on the issue, not as a separate alert history table. This is sufficient for MVP high-severity notification status but not for a full notification audit log.
- Existing npm audit findings remain:
  - moderate PostCSS advisory through latest `next@16.2.9`
  - dev esbuild/Vite advisory requiring a separate dev-tool upgrade

## QA Recommendation

After Resend keys are available, rerun:

```bash
npm run e2e -- e2e/alerts.spec.ts
```

Then verify one high-severity issue has:

```txt
alert_sent_at populated
alert_delivery_id populated
alert_error null
```

Also inspect the Resend dashboard to confirm the subject/body are redacted and do not contain raw payloads, auth headers, or secrets.
