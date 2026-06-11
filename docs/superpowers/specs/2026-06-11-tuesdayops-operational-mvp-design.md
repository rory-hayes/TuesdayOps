# TuesdayOps Operational MVP Design

## Approved Direction

Build TuesdayOps as an operational MVP first: scaffold the real Next.js application, create a seeded interactive product shell, then wire each seeded flow to Supabase, background jobs, alerts, reports, and billing milestone by milestone.

The first implementation slice should produce a usable foundation, not a disposable prototype. It must make the core product loop visible immediately:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Monthly Report
```

## Product Goal

TuesdayOps helps AI agencies keep client AI workflows healthy after launch. Agencies connect workflows, run health and QA checks, catch failures before clients do, resolve maintenance issues, and generate white-label monthly proof reports clients can understand.

The MVP must stay focused on post-launch operations. It must not become a full evals platform, client portal, agency CRM, workflow builder, marketplace, or general observability product.

## First Build Slice

The first build slice is the foundation sprint plus a seeded app shell:

- Next.js App Router project with TypeScript, Tailwind CSS, and shadcn/ui-ready structure.
- Calm TuesdayOps visual system using off-white backgrounds, slate typography, muted lavender accent, restrained status colors, compact cards, and clear operational hierarchy.
- App shell with dashboard, clients, workflows, checks/test packs, issues, reports, and settings navigation.
- Seeded data module that models agencies, clients, workflows, checks, check runs, issues, test packs, and reports.
- Dashboard route showing active clients, monitored workflows, open issues, check pass rate, recent issues, scheduled checks, and client workflow health.
- List/detail shells for clients and workflows.
- Issues queue with seeded status/severity filters.
- Reports area with seeded monthly report preview and white-label report modules.
- Setup files and scripts for linting, typechecking, testing, and local development.

This slice intentionally uses seeded data while preserving the real domain model and route boundaries. Seeded data must live in clearly named development/domain modules, not hidden inside unrelated UI components.

## Architecture

Use a simple Next.js application layout:

```txt
src/app
  (marketing)
  (app)
src/components
  app-shell
  dashboard
  clients
  workflows
  issues
  reports
  ui
src/lib
  data
  domain
  formatting
```

Domain logic should live outside React components. UI components should receive already-shaped view data where practical.

Future Supabase integration should fit behind service modules without changing the main screen contracts. Tenant-scoped data must retain `agency_id` as the boundary in all domain objects.

## Data Flow

Initial seeded flow:

```txt
seed data -> domain summary helpers -> route components -> UI components
```

Later persisted flow:

```txt
Supabase Auth session
  -> agency membership lookup
  -> tenant-scoped service query
  -> domain summary helpers
  -> route components
  -> UI components
```

Check execution and report generation will later move behind service/job boundaries:

```txt
manual or scheduled trigger
  -> check runner service
  -> assertion evaluation
  -> check_run write
  -> issue create/update
  -> alert/report aggregation
```

## UI Direction

The product UI should feel like a calm agency operations cockpit:

- soft white/off-white page background
- dark slate text
- muted lavender primary actions and focus states
- restrained red/amber/green status colors
- compact tables and cards
- desktop-first responsive layout
- clear health, issue, and report status hierarchy
- practical copy with little AI buzzwording

Avoid marketing-heavy hero layouts inside the app. The first logged-in surface should be the dashboard, not a sales page.

## Error Handling And Empty States

The foundation should include designed empty, loading, and error-ready patterns even if the first seeded pages rarely hit those states.

Initial expectations:

- Empty client/workflow/test/report lists explain the next action.
- Status badges make degraded and failed workflows easy to spot.
- Report preview only uses report-safe fields.
- Any future raw response or secret fields stay out of UI output by default.

## Testing And Verification

The first implementation slice must establish:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- at least one unit test around domain summary behavior
- a production build check when practical

For future Supabase-backed work, test tenant boundaries, validation schemas, check assertion behavior, issue deduplication, and report aggregation.

## Completion Criteria For This Slice

This slice is complete when:

1. The app runs locally.
2. The app shell renders the core navigation.
3. The dashboard shows realistic seeded operational data.
4. Clients, workflows, issues, and reports have navigable screens.
5. Domain summary logic is covered by tests.
6. Lint, typecheck, and tests pass.
7. The docs explain how to run the app locally.

The full MVP remains incomplete until real auth, Supabase persistence, scheduled checks, issue creation, synthetic tests, alerts, PDF reports, and billing are implemented and verified.
