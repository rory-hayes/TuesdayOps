# AGENTS.md — Codex Operating Rules for TuesdayOps

This file defines how AI coding agents must work in this repository.

## Mission

Build TuesdayOps as a focused SaaS MVP for AI agencies to monitor client AI workflows, detect issues, run lightweight QA checks, and generate white-label monthly proof-of-work reports.

Do not turn this into a general AI observability platform, full evals suite, client portal, CRM, billing system, workflow builder, or agency management platform.

## Non-negotiable product boundary

The core MVP loop is:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report
```

Every task must strengthen this loop.

## Agent behavior rules

1. Read `README.md`, `PRD.md`, `ARCHITECTURE.md`, `TASKS.md`, `ACCEPTANCE_CRITERIA.md`, and this file before making changes.
2. Implement only the active ticket unless explicitly instructed otherwise.
3. Do not invent scope.
4. Do not add new major frameworks without justification.
5. Do not add external paid services beyond the approved stack unless explicitly requested.
6. Do not store secrets, API keys, auth headers, or tokens in plaintext.
7. Do not weaken tenant isolation.
8. Do not bypass authentication or authorization checks.
9. Do not create placeholder/demo-only code in production paths unless clearly marked and isolated.
10. Do not remove tests to make a build pass.
11. Always prefer simple, maintainable code over clever abstractions.
12. Always update relevant docs when changing product behavior, schema, API contracts, or environment variables.
13. Stop after completing the assigned task and summarize exactly what changed.

## Approved MVP stack

Use this stack unless the user explicitly changes direction:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Inngest or Trigger.dev for background jobs
- Resend for email
- Stripe for billing
- PostHog for analytics
- Sentry for error tracking
- React PDF or server-side HTML-to-PDF for reports
- Zod for validation
- React Hook Form for forms
- Recharts for charts

## Architecture rules

- Keep domain logic outside React components.
- Use service modules for workflow checks, issue creation, report generation, and billing state.
- Use typed schemas with Zod for all input validation.
- Use server-side actions/API routes for privileged operations.
- Use row-level security or equivalent authorization controls for tenant isolation.
- Treat `agency_id` as a required tenant boundary on all tenant-owned records.
- Background jobs must be idempotent where possible.
- Scheduled checks must not create duplicate issues for the same active failure unless the failure changes materially.
- Reports must be reproducible from stored source data.
- For Next.js 16+ work, check local package docs and warnings when framework behavior is unclear.

## Security rules

- Never log raw secrets.
- Never return encrypted secrets to the frontend.
- Redact request/response bodies by default.
- Store only response summaries unless explicitly configured.
- Use allowlisted fields for report-safe content.
- Keep raw test payload storage optional and clearly marked.
- Use short retention defaults for raw check outputs.

## UX rules

The UI must be clean, calm, and agency-friendly.

Use the design direction from the mockups:

- soft white/off-white background
- muted lavender primary accent
- restrained semantic colors
- rounded cards
- generous whitespace
- minimal clutter
- clear workflow health/status hierarchy

Avoid:

- cyberpunk styling
- excessive colors
- overstuffed dashboards
- technical trace waterfalls in MVP
- AI buzzword-heavy copy

## Testing expectations

Every implementation task should include relevant tests when feasible:

- unit tests for pure business logic
- integration tests for API routes/services
- validation tests for schemas
- smoke tests for critical user flows

At minimum, run:

```bash
npm run lint
npm run typecheck
npm run test
```

If these scripts do not exist, add them during the foundation sprint.

## Documentation updates

Update docs when needed:

- `README.md` for setup changes
- `ARCHITECTURE.md` for system changes
- `DATA_MODEL.md` for schema changes
- `API_SPEC.md` for API changes
- `TASKS.md` for ticket status
- `CHANGELOG.md` for completed work

## Definition of done

A task is done only when:

- implementation matches the ticket
- acceptance criteria are satisfied
- tests pass or limitations are documented
- no secrets are exposed
- docs are updated
- no unrelated scope was added
