# TuesdayOps API Spec — MVP

This document outlines the internal API shape. Milestones 1-3 currently implement these flows with Next.js server actions rather than public JSON API routes. Exact route names may vary as later milestones add route handlers/background jobs.

## Auth

All API routes require an authenticated user unless explicitly public.

Tenant access is based on agency membership.

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
- OpenAPI JSON
- Postman collection JSON

The import path creates a normal workflow plus the first health check. Billing limits, tenant scoping, endpoint safety validation, and encrypted auth handling still apply.

Workflow endpoints are normalized and blocked in production when they target localhost, loopback, private networks, link-local ranges, metadata IPs, or `.local` hostnames. Local/private test environments can set `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true`.

Workflow check execution does not follow endpoint redirects. If an endpoint returns `3xx`, the run fails with a report-safe redirect-blocked error so checks cannot be redirected into private networks after initial URL validation.

### `PATCH /api/workflows/:id`

Updates workflow.

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

Supported assertion types in Milestone 3:

- `status_code`
- `latency_under`
- `field_exists`
- `equals`
- `not_contains`

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

The route also applies a fixed-window per-IP limiter. Excess attempts receive:

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

### `GET|POST|PUT /api/inngest`

Serves Inngest functions for background jobs.

Current functions:

- `scheduled-check-sweep` cron: every five minutes, queues due checks.
- `run-scheduled-check` event: runs one scheduled check with retry behavior.

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

### `POST /api/test-packs/:id/test-cases`

Creates test case.

Current server action equivalent: `createTestCaseAction(testPackId, name, inputJson, expectedStatus, maxLatencyMs, fieldExistsPath, notContainsValue)`.

The MVP assertion builder supports:

- required status code
- latency threshold
- optional JSON field existence path
- optional forbidden response text

```json
{
  "name": "Required result field",
  "inputJson": { "leadId": "qa-001" },
  "assertions": [
    { "type": "status_code", "expected": 200 },
    { "type": "latency_under", "maxMs": 5000 },
    { "type": "field_exists", "path": "result.id" },
    { "type": "not_contains", "value": "fatal" }
  ]
}
```

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

### `GET /api/reports/:id`

Returns report details.

### `POST /api/reports/:id/pdf`

Generates PDF.

Current server action equivalent: `generateReportPdfAction(reportId)`.

The PDF is rendered server-side from stored report data, uploaded to the private Supabase Storage `reports` bucket, and exposed through:

```txt
GET /api/reports/:id/download
```

The download route requires an authenticated agency member and streams the private PDF with `content-type: application/pdf`.

### `POST /api/reports/:id/send`

Sends report to configured recipient.

Current server action equivalent: `sendReportAction(reportId)`.

The send action ensures a PDF exists, then emails a download link with Resend. Missing Resend config or delivery errors are stored in `reports.send_error` and mark the report `failed` without exposing raw report data or secrets.

## Onboarding and sample data

### `seedSampleDataAction()`

Server action used from the Overview activation checklist.

The action:

- requires an authenticated agency workspace
- uses deterministic tenant-scoped UUIDs for demo rows
- upserts one demo client, workflow, check, issue, test pack, test case, test run, report, and report items
- stores no workflow auth secrets
- marks `agencies.sample_data_seeded_at`
- redirects back to Overview with a sample-data status

The seeded demo records stay inside the current agency tenant boundary.

## Billing

### `createCheckoutSessionAction()`

Server action used from Settings to start a Stripe Checkout subscription session.

The action:

- requires an authenticated agency workspace
- requires owner or admin role
- creates a Stripe customer if the agency does not have one
- stores `agencies.billing_customer_id`
- creates a Checkout Session with `mode = subscription`
- uses `STRIPE_PRICE_ID`
- redirects to Stripe's hosted Checkout URL

If Stripe env vars are missing, the action redirects back to Settings with a clear billing error.

### `createCustomerPortalSessionAction()`

Server action used from Settings to open the Stripe Customer Portal.

The action:

- requires owner or admin role
- requires an existing `billing_customer_id`
- creates a short-lived Stripe customer portal session
- redirects to Stripe's hosted portal URL

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

Starter limits:

```txt
clients: 1
workflows: 3
```

Design partner workspaces are unrestricted. Existing rows above a limit are preserved; only new create actions are blocked.

## Public/manual logging API — later MVP extension

### `POST /api/public/run-log`

Receives workflow run metadata from external workflow.

Requires API key.

```json
{
  "workflowId": "uuid",
  "status": "success",
  "latencyMs": 2100,
  "model": "gpt-4.1-mini",
  "costEstimate": 0.012,
  "outputSchemaPassed": true
}
```
