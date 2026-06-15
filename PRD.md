# TuesdayOps PRD

## 1. Summary

TuesdayOps is a SaaS platform for AI and automation agencies that manage live client AI workflows after launch.

The product helps agencies:

- monitor workflow health
- run scheduled QA checks
- detect failures and degraded behavior
- manage maintenance issues
- compare simple prompt/model changes
- generate white-label monthly reports for clients

## 2. Problem

AI agencies can build automations, agents, MCP servers, and workflow apps for clients, but post-launch maintenance is messy.

Common problems:

- Workflows fail silently.
- API credentials expire.
- Model outputs change.
- Prompt updates cause regressions.
- JSON/output format breaks.
- Latency or cost spikes.
- Clients ask what the monthly maintenance retainer covers.
- Agencies lack a clean report proving ongoing value.

## 3. Target customer

Initial ICP:

- AI automation agencies
- AI app/MCP implementation agencies
- no-code automation agencies moving into AI
- small AI consultancies with recurring maintenance retainers

Qualification criteria:

- 3+ retained clients
- 5+ live workflows
- recurring monthly maintenance/support revenue
- client-facing reporting need

## 4. Core product promise

> Keep client AI workflows healthy and prove the value of your monthly retainer.

## 5. MVP user stories

### Agency owner

- As an agency owner, I want to see all client workflow health in one dashboard so I know where my team needs to act.
- As an agency owner, I want branded monthly reports so I can prove retainer value to clients.
- As an agency owner, I want pricing based on clients/workflows rather than seats.

### Delivery lead

- As a delivery lead, I want to register each client workflow and schedule health checks.
- As a delivery lead, I want failed checks to create issues automatically.
- As a delivery lead, I want to assign and resolve issues.
- As a delivery lead, I want to test changes before they go live.

### Client success/account manager

- As an account manager, I want a simple monthly report that explains what was monitored, what broke, what was fixed, and what was improved.

## 6. MVP scope

### Must have

- Authentication
- Agency workspace
- Client CRUD
- Workflow CRUD
- Endpoint health check
- Scheduled check run
- Check result history
- Issue creation from failed/degraded checks
- Issue resolution workflow
- Test pack builder
- Synthetic test runner
- Report preview
- PDF report export
- Email alerting
- Basic billing gate

### Should have

- Slack alerts
- Brand color/logo for reports
- Model/prompt comparison MVP
- Dashboard charts
- Onboarding wizard

### Could have later

- Langfuse/LangSmith import
- OpenAI usage import
- Client portal
- Custom domains
- Advanced report templates
- Advanced AI judge scoring
- Browser-based synthetic checks
- Native n8n/Make/Zapier integrations

### Must not have in MVP

- Full trace explorer
- Full eval platform
- Prompt registry
- Model gateway
- Invoicing/time tracking
- Agency CRM
- Marketplace

## 7. Key screens

1. Landing page
2. Sign up / login
3. Onboarding wizard
4. Overview dashboard
5. Clients page
6. Client detail
7. Workflows page
8. Workflow detail
9. Checks / test packs
10. Issues queue
11. Reports page
12. Report preview
13. Settings / branding / billing

## 8. Success metrics

Product activation:

- user creates agency workspace
- user adds first client
- user adds first workflow
- first check run completed
- first issue created or first successful check history created
- first report generated

Business validation:

- 10 qualified agency interviews
- 5 agencies willing to connect real workflows
- 3 design partners willing to trial
- 2 agencies willing to pay €299–€399/month or pay for a pilot

## 9. Positioning

Do not position as an evals platform.

Position as:

> TuesdayOps is AgencyAnalytics for AI workflow maintenance.

Or:

> TuesdayOps helps AI agencies monitor client AI workflows, catch failures, and generate monthly proof-of-work reports.
