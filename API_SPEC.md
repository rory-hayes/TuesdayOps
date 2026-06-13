# TuesdayOps API Spec — MVP

This document outlines the internal API shape. Milestones 1-3 currently implement these flows with Next.js server actions rather than public JSON API routes. Exact route names may vary as later milestones add route handlers/background jobs.

## Auth

All API routes require an authenticated user unless explicitly public.

Tenant access is based on agency membership.

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

### `PATCH /api/workflows/:id`

Updates workflow.

### `POST /api/workflows/:id/run-check`

Manually triggers a check run. Current server action equivalent: `runCheckAction(checkId)`.

If the run is failed or degraded, the current implementation creates or updates one active issue for the material failure fingerprint.

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

### `GET /api/reports/:id`

Returns report details.

### `POST /api/reports/:id/pdf`

Generates PDF.

### `POST /api/reports/:id/send`

Sends report to configured recipient.

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
