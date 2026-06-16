# TuesdayOps Roadmap

## MVP

- Client/workflow registry
- Endpoint health checks
- Synthetic test packs
- Issues queue
- Monthly report generation
- White-label PDF export
- Email alerts
- Billing gate
- Production provider readiness checks
- Quick workflow import from URL, cURL, OpenAPI JSON/YAML/URL, and Postman JSON
- Production endpoint safety guard
- Operational reliability and report readiness gates
- External run logging API
- Report automation schedules
- Model/prompt comparison summaries
- Public logged-out landing page

## V1

- Advanced report templates
- Workflow grouping/tags
- Model/prompt comparison improvements
- Native onboarding helpers for n8n/Make/Zapier beyond generic webhook/import templates

## V2

- Native n8n integration
- Native Make integration
- Langfuse import
- LangSmith import
- Helicone import
- OpenAI/Anthropic usage import
- Public status pages

## V3

- Multi-brand agencies
- Advanced RBAC
- Report approval workflow
- AI-generated recommendations
- Private deployments/BYOC
- Agency marketplace templates
- Custom evaluator builder

## Product boundaries

The current design-partner plan explicitly ignores Slack alerts, PostHog analytics, brand-logo work, client portal, and browser synthetic checks.

Do not move into:

- full AI observability
- agency CRM
- billing/invoicing
- workflow building
- general uptime monitoring

unless customer evidence strongly proves the need.
