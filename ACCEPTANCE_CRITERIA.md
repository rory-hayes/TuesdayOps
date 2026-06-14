# TuesdayOps Acceptance Criteria

## Global acceptance criteria

Every feature must satisfy:

- authenticated users only unless public by design
- tenant-scoped data access
- no plaintext secret exposure
- clear loading/error/empty states
- responsive desktop-first layout
- basic tests where feasible
- docs updated if behavior changes

## Foundation

- User can sign up and sign in.
- User can create or join an agency workspace.
- User cannot access another agency's data.
- App shell renders with navigation.

## Clients

- User can create, view, update, and archive clients.
- Client list displays health summary fields.
- Client detail shows workflows, issues, and reports.
- Empty state guides user to add first client.

## Workflows

- User can create a workflow under a client.
- Workflows opens to the full workflow registry before setup forms.
- Add workflow opens a guided onboarding modal with quick import and manual endpoint setup.
- User can import a workflow from URL, cURL, OpenAPI JSON, or Postman collection JSON.
- User can configure endpoint URL, method, auth type, frequency, and expected status.
- Auth config is encrypted or stored securely.
- Production blocks localhost/private-network workflow endpoints unless private endpoint mode is explicitly enabled for local/private testing.
- User can manually run a check.
- Workflow status updates from check results.

## Checks

- User can create health check config.
- System validates check config.
- Manual check run stores result.
- Scheduled check run stores result.
- Failed/degraded check creates or updates issue.

## Test packs

- User can create test pack.
- User can create test cases with input and assertions.
- User can run test pack manually.
- Results show passed/failed counts.
- Failed test creates issue when configured.

## Issues

- Issue queue lists issues across clients.
- User can filter by client, workflow, status, severity.
- User can assign issue.
- User can resolve issue with note.
- Resolved issue can be included in report.

## Reports

- User can generate report for a client and period.
- Report aggregates workflows, checks, issues, and resolutions.
- User can preview report.
- User can generate PDF.
- PDF is stored and downloadable.
- Report respects agency branding.

## Alerts

- High-severity issue sends email alert.
- Alert does not include raw payloads or secrets.
- Alert links to issue in app.

## Billing

- User can see current plan.
- Plan limits are enforced for clients/workflows.
- Stripe checkout/customer portal is wired or stubbed clearly for MVP.

## Dashboard

- Overview displays active clients, monitored workflows, open issues, check pass rate.
- Recent issues list works.
- Scheduled checks list works.
- Client workflows table works.

## Production readiness

- `/api/health` returns provider readiness without exposing secret values.
- Launch-blocking provider configuration stays in operator-only health/deployment checks, not user-facing Settings.
- Settings shows operational reliability status from enabled checks, stale workflow data, high-risk open issues, and report queue state.
- Reports show ready/review/blocked quality state before send/export.

## Definition of MVP complete

The MVP is complete when a user can:

1. Sign up.
2. Create an agency.
3. Add a client.
4. Add a workflow endpoint.
5. Run a check.
6. See check history.
7. Get an issue from a failed check.
8. Resolve the issue.
9. Create a test pack.
10. Run a synthetic test.
11. Generate a report PDF.
