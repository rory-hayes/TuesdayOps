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
- Workflow settings allow credential rotation by submitting a new secret. Saved secrets are never displayed; leaving the secret field blank keeps the existing encrypted value.

## Check response storage

Default behavior:

- store status code
- store latency
- store assertion results
- store short response summary
- store redacted error message

The current HTTP check runner stores a short response summary and redacts emails, bearer tokens, and common secret-like JSON fields before persistence.

Avoid storing full raw bodies unless user explicitly enables debug mode.

## Workflow endpoint safety

Workflow endpoints are validated before storage and again before execution. The stored endpoint URL preserves the submitted URL string after trimming so signed query strings and path casing are not rewritten.

Production blocks:

- `localhost`
- loopback IPs such as `127.0.0.1` and `::1`
- private IPv4 ranges such as `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`
- link-local and cloud metadata ranges such as `169.254.0.0/16`
- IPv6 unique-local and link-local ranges
- `.local` hostnames
- public-looking hostnames that resolve to blocked private, loopback, link-local, or metadata addresses at execution/import time
- DNS rebinding between validation and execution is reduced by connecting workflow checks to the previously validated public address while preserving the original Host/SNI for HTTP(S).

Local development and private test environments can set `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true`. Do not enable this in production.

## Public route abuse controls

`POST /api/public/run-log` applies DB-backed fixed-window limits:

- a pre-auth client-IP bucket before bearer token validation or payload parsing
- a pre-auth global bucket before bearer token validation or payload parsing
- a workflow-key bucket after token extraction

Bucket keys are hashed before persistence so raw API keys and IP identifiers are not stored in plaintext.

Repeated invalid bearer keys are also cached in process memory for a short period using a truncated SHA-256 fingerprint. This reduces repeated database lookup work for the same bad key without storing or logging the raw bearer value. The cache is per app process/instance and is best-effort only; the DB-backed pre-auth IP/global buckets remain the cross-instance deployment control.

Manual health-check execution uses DB-backed agency-wide and user-scoped buckets. Scheduled health-check execution uses a DB-backed agency-wide bucket before each outbound check run. Rate-limit responses return generic safe messages plus standard retry headers and do not include token material, request bodies, auth headers, or raw workflow payloads.

## Data redaction

Redact common sensitive values:

- emails
- phone numbers
- API keys
- bearer tokens
- credit card-like numbers
- passwords
- secrets in headers
- provider/database internals before showing server-action, auth, billing, onboarding, alert, or report errors to users

User-entered agency/client free-text fields strip script/style blocks, HTML tags, event-handler attributes, and `javascript:` URLs before storage. Explicit slugs are accepted only when they already match lowercase letters, numbers, and single hyphens; blank slug fields are generated from the sanitized name.

Sign-up and password reset require confirmed passwords with at least 12 characters, including uppercase, lowercase, number, and symbol characters.

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

## Browser security headers

Production responses set browser security headers globally:

- `Content-Security-Policy: frame-ancestors 'none'`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

The Next.js `X-Powered-By` header is disabled. `npm run smoke:production` verifies these headers against the deployed app.

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
