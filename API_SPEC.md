# TuesdayOps API Spec — MVP

This document outlines the internal API shape. Exact route names may vary depending on framework conventions.

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

Manually triggers a check run.

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
    "expectedStatus": 200,
    "timeoutMs": 10000,
    "assertions": []
  }
}
```

## Check runs

### `GET /api/workflows/:workflowId/check-runs`

Lists recent runs.

### `POST /api/check-runs/:id/retry`

Retries check run.

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

### `POST /api/issues/:id/resolve`

Resolves issue.

```json
{
  "resolutionNote": "Updated retry logic and reran test pack successfully."
}
```

### `POST /api/issues/:id/ignore`

Marks issue ignored.

## Test packs

### `GET /api/workflows/:workflowId/test-packs`

Lists test packs.

### `POST /api/workflows/:workflowId/test-packs`

Creates test pack.

### `POST /api/test-packs/:id/run`

Runs all test cases.

### `POST /api/test-packs/:id/test-cases`

Creates test case.

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
