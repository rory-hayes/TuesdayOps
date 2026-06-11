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
