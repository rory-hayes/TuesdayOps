# TuesdayOps Security Requirements

TuesdayOps handles agency and client operational data. The MVP must be secure by default.

## Core principles

1. Tenant isolation is mandatory.
2. Secrets must never be stored in plaintext.
3. Raw workflow responses should be redacted or summarized by default.
4. Reports must only include client-safe information.
5. Background jobs must enforce agency boundaries.

## Tenant isolation

All tenant-owned tables require `agency_id`.

Use Supabase RLS where possible.

Service-role operations must manually verify agency membership before acting.

## Secrets

Secrets include:

- bearer tokens
- API keys
- webhook auth headers
- basic auth credentials
- Slack webhook URLs

Storage requirements:

- encrypt before persistence
- never expose to frontend after creation
- never log raw values
- allow rotation/deletion

Milestones 1-3 implementation:

- Workflow auth config is accepted only in server actions.
- Non-empty workflow auth config is encrypted with AES-256-GCM before persistence.
- `WORKFLOW_AUTH_ENCRYPTION_KEY` is required before storing bearer/API/basic auth secrets.
- Encrypted workflow auth config is used only by the server-side check runner and is not returned to protected UI components.

## Check response storage

Default behavior:

- store status code
- store latency
- store assertion results
- store short response summary
- store redacted error message

The current HTTP check runner stores a short response summary and redacts emails, bearer tokens, and common secret-like JSON fields before persistence.

Avoid storing full raw bodies unless user explicitly enables debug mode.

## Data redaction

Redact common sensitive values:

- emails
- phone numbers
- API keys
- bearer tokens
- credit card-like numbers
- passwords
- secrets in headers

## Report safety

Reports should include:

- issue titles
- issue categories
- counts
- resolution summaries
- high-level workflow health
- safe recommendations

Reports should not include:

- raw request bodies
- raw model outputs containing PII
- auth headers
- internal-only notes unless explicitly marked reportable

## Alert safety

Slack/email alerts should be concise and not leak sensitive payloads.

Example safe alert:

```txt
High severity issue detected
Client: Acme Marketing
Workflow: Lead Generation AI
Issue: Output format validation failed
Detected: 10:30 AM
Action: View in TuesdayOps
```

## Audit events

Record key events:

- client created/updated/deleted
- workflow created/updated/deleted
- check created/updated/deleted
- check run failed
- issue created/resolved/ignored
- report generated/sent
- billing plan changed
- user invited/removed

## MVP compliance posture

Do not claim SOC 2 compliance.

Allowed language:

- secure by design
- encrypted secrets
- tenant-isolated workspaces
- audit log
- report-safe data controls

Avoid compliance claims until actually implemented/audited.
