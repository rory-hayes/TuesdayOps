# TuesdayOps

TuesdayOps is a white-label AI workflow maintenance platform for agencies.

It helps AI and automation agencies monitor client AI workflows after launch, run lightweight QA checks, detect failures, manage maintenance issues, and generate monthly client-ready proof-of-work reports.

## Product promise

> Connect your client AI workflows. TuesdayOps monitors them, flags issues, runs QA checks, and generates monthly reports that prove what was maintained, fixed, and improved.

## MVP scope

The MVP is intentionally narrow. It should validate whether agencies managing live AI workflows will pay for post-launch monitoring and proof reporting.

### Included in MVP

- Agency workspace
- User authentication
- Client management
- Workflow registry
- Endpoint health checks
- Scheduled check runs
- Synthetic test packs
- Issue creation and resolution
- Email and/or Slack alerts
- Monthly white-label report preview
- PDF report export
- Simple billing gate

### Excluded from MVP

- Full AI observability platform
- Deep trace explorer
- LangSmith/Langfuse clone
- Prompt registry
- Model gateway
- Full eval studio
- Agency CRM
- Invoicing/time tracking
- Full client portal
- Marketplace
- Dozens of native integrations

## Core object model

```txt
Agency
  -> User
  -> Client
    -> Workflow
      -> Check
        -> Check Run
          -> Issue
            -> Resolution
              -> Monthly Report
```

## Primary users

- AI agency founder
- AI automation agency operator
- Head of delivery
- Technical implementation lead
- Client success/account manager

## Initial customer profile

AI and automation agencies with:

- 3+ retained clients
- 5+ live client workflows
- recurring maintenance/support work
- a need to prove monthly value to clients

## Build principle

Build the smallest useful product that proves this loop:

1. Add a client.
2. Add a workflow.
3. Connect a check endpoint.
4. Run checks on a schedule.
5. Create issues from failed checks.
6. Resolve issues.
7. Generate a monthly report.

If a feature does not support this loop, it should not be part of the MVP.

## Local development

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` or `ENV_EXAMPLE.md`.

Required for the authenticated MVP paths:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
WORKFLOW_AUTH_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY` is reserved for future server-side/admin operations and must never be exposed to the browser.

Local Supabase uses the repo `supabase/config.toml` port range `55420-55429` to avoid clashes with other local Supabase projects.

Run the app:

```bash
npm run dev
```

Verify the app:

```bash
npm run lint
npm run typecheck
npm run test
```

Build for production:

```bash
npm run build
```

## Current implementation state

The repository now contains the foundation, Milestones 1-3, and the issue-management slice of Milestone 4:

- Next.js App Router app
- TypeScript and Tailwind CSS
- TuesdayOps app shell
- Supabase SSR auth clients and protected app routes
- agency onboarding through a tenant-safe Supabase RPC
- Supabase migration for profiles, agencies, memberships, clients, workflows, checks, check runs, and issues
- tenant-scoped overview, clients, workflows, checks, issues, reports, and settings screens
- client create/update/archive server actions
- workflow creation with encrypted auth config handling
- endpoint health check creation, manual run execution, assertion evaluation, and check run persistence
- failed/degraded manual checks create deduped issues with severity mapping
- issue queue filters, expandable details, assignment, resolution notes, and ignore actions
- domain, assertion, and issue-engine tests

Scheduled checks, alerts, test packs, report PDF generation, and Stripe billing are later milestones.
