# TuesdayOps Integrations

## MVP integration philosophy

Start with generic workflow connection methods. Do not build deep native integrations until customers validate demand.

The first integrations should be broad and low-friction:

1. HTTP endpoint checks
2. Webhook checks
3. Synthetic POST requests
4. Manual run logging API
5. Slack webhook alerts
6. Email alerts
7. PDF report export

## Connection levels

### Level 1 — Endpoint health checks

Agency provides:

- URL
- method
- headers/auth
- body payload if required
- expected status code
- expected response fields
- timeout
- schedule

TuesdayOps checks:

- endpoint availability
- latency
- status code
- response assertion
- failure/degraded status

### Level 2 — Synthetic test pack invocation

Agency provides:

- sample input payloads
- expected output assertions
- blocked output conditions
- latency/cost thresholds

TuesdayOps runs:

- test case request
- output validation
- assertion checks
- pass/fail summary
- issue creation

### Level 3 — Run logging API / SDK

Later feature.

Agency workflow sends metadata to TuesdayOps:

```json
{
  "workflow_id": "wf_123",
  "status": "success",
  "latency_ms": 2100,
  "model": "gpt-4.1-mini",
  "prompt_version": "v1.2",
  "cost_estimate": 0.014,
  "output_schema_passed": true,
  "error_type": null
}
```

## Tools to support in MVP

### n8n

MVP support:

- monitor production webhook endpoint
- send synthetic POST payload
- validate response

Later:

- n8n API integration
- workflow execution history import

### Make

MVP support:

- webhook URL health check
- synthetic invocation

Later:

- scenario status import

### Zapier

MVP support:

- Zapier webhook endpoint
- synthetic test invocation

Later:

- Zapier app integration if needed

### Vercel

MVP support:

- health endpoint/API route check
- custom app endpoint monitoring

Later:

- deployment status integration

### Supabase Edge Functions

MVP support:

- function endpoint monitoring
- authenticated request checks

Later:

- logs/metrics import

### MCP servers

MVP support:

- `/health` endpoint check
- optional tool-list endpoint check

Later:

- synthetic MCP tool invocation
- tool-level check result reporting

### Custom APIs

MVP support:

- arbitrary GET/POST checks
- header auth
- body payload
- JSON assertions

## Slack alerts

Use incoming Slack webhooks for MVP.

Alert types:

- high-severity issue created
- workflow down
- report overdue
- recurring test failure
- check runner failure

## Email alerts

Use Resend.

Email types:

- workflow failed
- issue assigned
- report ready
- report sent
- weekly digest

## What not to build first

- OAuth integrations for every platform
- Deep n8n/Make/Zapier APIs
- Direct OpenAI usage import
- Direct Anthropic usage import
- Native LangSmith/Langfuse ingest
- Browser automation
- Client portal integration

## Later integration ideas

- Langfuse import
- LangSmith import
- Helicone import
- Better Stack link/embed
- Linear issue creation
- ClickUp issue creation
- Jira issue creation
- Slack bot
- OpenAI usage ingest
- Anthropic usage ingest
