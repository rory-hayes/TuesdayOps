# Tuesday API Spec — MVP

This document outlines the internal API shape. Most authenticated mutations are implemented with Next.js server actions rather than public JSON API routes. Public API routes are called out explicitly.

## Auth

All API routes require an authenticated user unless explicitly public.

Tenant access is based on agency membership.

Tenant-scoped mutation actions must confirm that the target row was actually updated before returning success. If a client, workflow, or issue update matches no row in the current agency, the action returns a not-found/not-accessible error and does not record audit activity.

## Public health

### `GET /api/health`

Public deployment health/readiness payload.

The response does not include secret values. It only exposes provider group status.

```json
{
  "ok": true,
  "status": "ready",
  "launchReady": true,
  "generatedAt": "2026-06-14T09:00:00.000Z",
  "checks": [
    { "id": "app", "status": "ready", "required": true },
    { "id": "supabase", "status": "ready", "required": true }
  ]
}
```

## Clients

### `GET /api/clients`

Returns clients for current agency.

### `POST /api/clients`

Creates a client.

Required body:

```json
{
  "name": "Acme Marketing",
  "industry": "Marketing Agency",
  "reportRecipientEmail": "ops@acme.com"
}
```

### `GET /api/clients/:id`

Returns one client.

### `PATCH /api/clients/:id`

Updates one client.

### `DELETE /api/clients/:id`

Soft-deletes a client if no active workflows or confirms cascade behavior.

## Workflows

### `GET /api/workflows`

Returns workflows for current agency.

Optional query params:

- `clientId`
- `status`
- `type`

### `POST /api/workflows`

Creates workflow.

```json
{
  "clientId": "uuid",
  "name": "Lead Generation AI",
  "type": "webhook",
  "endpointUrl": "https://example.com/webhook",
  "method": "POST",
  "checkFrequencyMinutes": 15
}
```

The Workflows page also supports quick import through the server action equivalent `createWorkflowFromImportAction`. Supported import sources:

- direct URL
- cURL command
- OpenAPI JSON, YAML, pasted text, or safe public URL
- Postman collection JSON

The import path creates a normal workflow plus the first health check. Billing limits, tenant scoping, endpoint safety validation, and encrypted auth handling still apply.

Client and workflow creation writes are server-action controlled. Browser-token direct inserts are revoked for `clients` and `workflows` so plan-limit checks cannot be bypassed through direct Supabase table access.

Workflow endpoints are normalized and blocked in production when they target localhost, loopback, private networks, link-local ranges, metadata IPs, or `.local` hostnames. Local/private test environments can set `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true`.

Workflow endpoint URLs must not contain userinfo credentials or secret-shaped query parameters such as `api_key`, `access_token`, `token`, `signature`, or `client_secret`. Store auth material through the workflow authentication settings so it is encrypted at rest.

When editing a workflow with saved credentials, changing the endpoint origin requires entering a fresh auth secret. Editing the path, cadence, assertions, or metadata on the same endpoint origin can still preserve the existing encrypted credential.

Workflow check execution does not follow endpoint redirects. If an endpoint returns `3xx`, the run fails with a report-safe redirect-blocked error so checks cannot be redirected into private networks after initial URL validation.

### `PATCH /api/workflows/:id`

Updates workflow.

Current server action equivalents also include archive support. Archived workflows are removed from active app views and cannot receive public run-log updates, but historical runs/issues/reports remain stored.

### `POST /api/workflows/:id/run-check`

Manually triggers a check run. Current server action equivalent: `runCheckAction(checkId)`.

If the run is failed or degraded, the current implementation creates or updates one active issue for the material failure fingerprint.

Check response bodies are read with a bounded retention limit and then summarized/redacted before persistence. Large responses are marked as truncated in `response_summary`.

## Checks

### `GET /api/workflows/:workflowId/checks`

Lists checks for a workflow.

### `POST /api/workflows/:workflowId/checks`

Creates check.

```json
{
  "name": "Default health check",
  "type": "health",
  "config": {
    "timeoutMs": 10000,
    "assertions": [
      { "type": "status_code", "expected": 200 },
      { "type": "latency_under", "maxMs": 5000 }
    ]
  }
}
```

Supported assertion types:

- `status_code`
- `latency_under`
- `field_exists`
- `field_not_empty`
- `equals`
- `contains_text`
- `not_contains`
- `matches_regex`
- `valid_json`

Regex assertions reject patterns with nested quantified groups, backreferences, or repeated ambiguous alternation before storage/execution. Stored unsafe regex assertions fail safely without evaluating against the response body.

## Check runs

### `GET /api/workflows/:workflowId/check-runs`

Lists recent runs.

### `POST /api/check-runs/:id/retry`

Retries check run.

### `POST /api/scheduler/run-due-checks`

Protected operational trigger for QA and smoke testing the scheduled runner.

Requires either:

- `Authorization: Bearer <SCHEDULER_SECRET>`
- `x-scheduler-secret: <SCHEDULER_SECRET>`

The route uses the server-only Supabase secret key, loads enabled due health checks, runs them, persists scheduled `check_runs`, and creates or updates issues through the same service path as manual checks.

The route applies a fixed-window per-IP limiter before authorization and a DB-backed service-role limiter after authorization so limits survive multiple Vercel instances. Excess attempts receive:

```json
{
  "error": "Too many scheduler trigger attempts."
}
```

with HTTP `429` and `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.

Optional JSON body for targeted operational smoke tests:

```json
{
  "checkId": "uuid"
}
```

When `checkId` is provided, the route only attempts that enabled due health check. Without a body, it runs the normal due-check batch for cron/scheduler usage.

Response:

```json
{
  "ok": true,
  "attempted": 1,
  "completed": 1,
  "skipped": 0,
  "failed": 0
}
```

### `POST /api/scheduler/run-monthly-reports`

Protected operational trigger for monthly report draft automation.

Requires either:

- `Authorization: Bearer <SCHEDULER_SECRET>`
- `x-scheduler-secret: <SCHEDULER_SECRET>`

The route uses the server-only Supabase secret key, finds active clients with `report_automation_enabled = true` and due `next_report_due_on`, generates prior-month report drafts from stored source data, updates `last_report_generated_at`, and advances the next due date. It does not send report emails.

The route uses the same DB-backed scheduler limiter pattern as due checks. Excess attempts receive HTTP `429` with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.

Response:

```json
{
  "ok": true,
  "attempted": 2,
  "generated": 2,
  "skipped": 0,
  "failed": 0
}
```

### Supabase Cron job

Production scheduling uses Supabase Cron job `tuesdayops-run-due-checks`.

The job runs:

```sql
select public.trigger_due_check_sweep();
```

`trigger_due_check_sweep()` calls `POST /api/scheduler/run-due-checks` with `pg_net` and a 45-second timeout. The Vercel app URL and scheduler secret are read from Supabase Vault secrets named `tuesdayops_app_url` and `tuesdayops_scheduler_secret`.

## Issues

### `GET /api/issues`

Lists issues.

Optional query params:

- `status`
- `severity`
- `clientId`
- `workflowId`

### `PATCH /api/issues/:id`

Updates issue fields.

Current server action equivalent for assignment: `assignIssueToMeAction(issueId)`.

### `POST /api/issues/:id/resolve`

Resolves issue.

```json
{
  "resolutionNote": "Updated retry logic and reran test pack successfully."
}
```

Current server action equivalent: `resolveIssueAction(issueId, resolutionNote)`.

### `POST /api/issues/:id/ignore`

Marks issue ignored.

Current server action equivalent: `ignoreIssueAction(issueId)`.

High/critical issue alerts:

- Newly created high or critical issues attempt a Resend email alert.
- Repeat deduped failures do not resend email.
- Alert emails use allowlisted issue/client/workflow/check fields and redacted copy only.
- Delivery metadata is stored on the issue in `alert_sent_at`, `alert_delivery_id`, `alert_error`, and `alert_last_attempt_at`.
- Missing Resend configuration records `alert_error` but does not fail check execution or issue creation.

## Test packs

### `GET /api/workflows/:workflowId/test-packs`

Lists test packs.

### `POST /api/workflows/:workflowId/test-packs`

Creates test pack.

Current server action equivalent: `createTestPackAction(workflowId, name, description)`.

The created row is scoped by `agency_id` and references the workflow through a tenant-matched foreign key.
Successful creation redirects back to Checks with a visible success notice.

```json
{
  "workflowId": "uuid",
  "name": "Lead intake regression pack",
  "description": "Happy-path and required-field guardrail checks"
}
```

### `POST /api/test-packs/:id/run`

Runs all test cases.

Current server action equivalent: `runTestPackAction(testPackId)`.

The runner:

- loads the tenant-scoped pack, workflow, and cases
- reuses the workflow endpoint/auth configuration
- sends each case `input_json` through the HTTP check runner
- stores one `test_runs` row per case
- creates or updates a reportable issue linked to `test_run_id` when a case fails
- resolves the active synthetic issue for the same test case when a later run passes
- redirects back to Checks with a visible completion notice when the run finishes

### `POST /api/test-packs/:id/test-cases`

Creates test case.

Current server action equivalent: `createTestCaseAction(testPackId, name, inputJson, expectedStatus, maxLatencyMs, fieldExistsPath, fieldNotEmptyPath, containsTextValue, matchesRegexPattern, requireValidJson, notContainsValue)`.
Successful creation redirects back to Checks with a visible success notice.

The MVP assertion builder supports:

- required status code
- latency threshold
- optional valid JSON requirement
- optional JSON field existence path
- optional non-empty JSON field path
- optional required response text
- optional regex match
- optional forbidden response text

```json
{
  "name": "Required result field",
  "inputJson": { "leadId": "qa-001" },
  "assertions": [
    { "type": "status_code", "expected": 200 },
    { "type": "latency_under", "maxMs": 5000 },
    { "type": "valid_json" },
    { "type": "field_exists", "path": "result.id" },
    { "type": "field_not_empty", "path": "result.answer" },
    { "type": "contains_text", "value": "approved" },
    { "type": "matches_regex", "pattern": "case-[0-9]+" },
    { "type": "not_contains", "value": "fatal" }
  ]
}
```

Current server action equivalents also support editing/disabling test packs, editing test cases, and archiving test cases. Disabled/archived records are hidden from active run controls without deleting historical test runs or issues.

## Reports

### `GET /api/reports`

Lists reports.

### `POST /api/reports/generate`

Generates report draft.

```json
{
  "clientId": "uuid",
  "periodStart": "2025-05-01",
  "periodEnd": "2025-05-31"
}
```

Current server action equivalent: `generateReportAction(clientId, period)`.

The generated report stores:

- client-safe executive summary
- metrics JSON
- recommendations JSON
- report item modules
- status `draft`

Source data includes workflow health, check runs, reportable issues, resolutions, and synthetic test runs.

Report items may include `model_prompt_changes`, which compares check runs by stored `model` and `prompt_version` values.

### `GET /api/reports/:id`

Returns report details.

### `POST /api/reports/:id/pdf`

Generates PDF.

Current server action equivalent: `generateReportPdfAction(reportId)`.

The PDF is rendered server-side from stored report data, uploaded to the private Supabase Storage `reports` bucket, and exposed through:

```txt
GET /api/reports/:id/download
```

The PDF action and download route require report readiness to be `ready` or `review`. Blocked reports return a safe readiness error and cannot be exported.

The download route requires an authenticated agency member and streams the private PDF with `content-type: application/pdf`. It derives the private storage key as `agency_id/report_id.pdf` after the tenant-scoped report lookup, rather than trusting a client-mutable path field. If the report has become blocked since PDF generation, the route returns `409` with the first report-readiness blocker.

### `POST /api/reports/:id/send`

Sends report to configured recipient.

Current server action equivalent: `sendReportAction(reportId)`.

The send action requires report readiness to be `ready` or `review`, ensures a PDF exists, then emails the report through Resend with the PDF attached and the authenticated app download link included for app users. Missing Resend config or delivery errors are stored in `reports.send_error`, mark the report `failed`, and redirect back to the report detail with a visible error instead of a success-style notice. Error copy is sanitized before it is shown or stored.

## Public run logging

### `POST /api/public/run-log`

Receives workflow run metadata from external systems.

Requires:

- `Authorization: Bearer <workflow-run-log-api-key>`

Run-log API keys are generated from the workflow detail page, shown once, stored only as hashes, and scoped to one workflow. The body `workflowId` must match the key's workflow.

```json
{
  "workflowId": "uuid",
  "status": "failed",
  "latencyMs": 2100,
  "statusCode": 500,
  "model": "gpt-4.1-mini",
  "promptVersion": "support-triage-v7",
  "costEstimate": 0.012,
  "outputSchemaPassed": false,
  "errorType": "schema_mismatch",
  "errorMessage": "Missing required answer field"
}
```

Allowed `status` values:

- `success`
- `healthy`
- `degraded`
- `failed`
- `error`

Successful requests create a normal `check_runs` row under an "External run log" check, update the workflow health summary, update key `last_used_at`, and create/update an issue when the mapped status is degraded or failed.

The route applies a DB-backed rate limit keyed by a hash of the bearer API key. The plaintext key is never stored in rate-limit state. Excess requests receive HTTP `429` with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.

Response:

```json
{
  "ok": true,
  "checkRunId": "uuid",
  "status": "failed",
  "issueCreated": true
}
```

## Onboarding

The Overview activation checklist is derived from real tenant data only:

- agency workspace exists
- first client exists
- first workflow exists
- first check run exists
- first report exists

There is no production server action for seeding demo records.

Logged-out users visiting `/` see the public Tuesday landing page. Authenticated users visiting `/` still see the tenant overview dashboard, and authenticated users without an agency are redirected to onboarding.

## Billing

### `createCheckoutSessionAction(formData?: FormData)`

Server action used from Settings to start a Stripe Checkout subscription session.

The action:

- requires an authenticated agency workspace
- requires owner or admin role
- applies a DB-backed per-user checkout-start rate limit before contacting Stripe
- accepts a server-validated self-serve `plan` value of `starter`, `growth`, or `scale`
- creates a Stripe customer if the agency does not have one
- stores `agencies.billing_customer_id` through server-side service-role code
- creates a Checkout Session with `mode = subscription`
- maps the selected plan to `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_GROWTH`, or `STRIPE_PRICE_ID_SCALE`
- redirects to Stripe's hosted Checkout URL
- redirects back to Settings with sanitized billing errors if provider setup or Checkout fails
- blocks `agency_plus` Checkout attempts and routes Agency+ to the contact-sales request form

If Stripe env vars are missing, the action redirects back to Settings with a clear billing error.

### `createCustomerPortalSessionAction()`

Server action used from Settings to open the Stripe Customer Portal.

The action:

- requires owner or admin role
- requires an existing `billing_customer_id`
- applies a DB-backed per-user portal-start rate limit before contacting Stripe
- creates a short-lived Stripe customer portal session
- redirects to Stripe's hosted portal URL
- redirects back to Settings with sanitized billing errors if provider setup or Portal creation fails

### `POST /api/stripe/webhook`

Receives Stripe webhook events.

Security and behavior:

- verifies the raw request body with `STRIPE_WEBHOOK_SECRET`
- stores processed event IDs in `billing_events`
- handles `checkout.session.completed`
- handles `customer.subscription.created`
- handles `customer.subscription.updated`
- handles `customer.subscription.deleted`
- updates agency subscription/customer/price/status fields through the Supabase service role

### Plan limits

Client and workflow creation server actions enforce plan limits before inserting new records.

Current plan limits:

```txt
Starter: 3 clients, 10 workflows
Growth: 10 clients, 50 workflows
Scale: 30 clients, 150 workflows
Agency+: custom limits
```

Design partner workspaces are unrestricted. Existing rows above a limit are preserved; only new create actions are blocked.
