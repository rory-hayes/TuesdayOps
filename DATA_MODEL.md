# TuesdayOps Data Model

This document defines the MVP data model.

## agencies

Represents an AI agency using TuesdayOps.

```txt
id uuid primary key
name text not null
slug text unique not null
logo_url text
primary_color text default '#7C6CF2'
plan text default 'starter'
billing_customer_id text
billing_subscription_id text
billing_status text default 'trialing'
billing_price_id text
billing_current_period_end timestamptz
trial_ends_at timestamptz
sample_data_seeded_at timestamptz -- legacy field retained for existing migrated databases; not used by active onboarding
created_at timestamptz default now()
updated_at timestamptz default now()
```

## users / profiles

Use Supabase Auth for identity. Store app profile fields separately.

```txt
id uuid primary key -- auth user id
name text
email text not null
avatar_url text
created_at timestamptz default now()
updated_at timestamptz default now()
```

## memberships

Maps users to agencies.

```txt
id uuid primary key
agency_id uuid references agencies(id)
user_id uuid references profiles(id)
role text check in ('owner', 'admin', 'member', 'viewer')
created_at timestamptz default now()
```

## clients

Represents one agency client.

```txt
id uuid primary key
agency_id uuid references agencies(id)
name text not null
slug text not null
industry text
logo_url text
owner_user_id uuid references profiles(id)
report_recipient_email text
report_cadence text default 'monthly'
report_automation_enabled boolean default false
next_report_due_on date
last_report_generated_at timestamptz
notes text
archived_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

## workflows

Represents an AI workflow, automation, agent, MCP server, or app endpoint.

```txt
id uuid primary key
agency_id uuid references agencies(id)
client_id uuid references clients(id)
name text not null
type text check in ('http_endpoint', 'webhook', 'n8n', 'make', 'zapier', 'mcp_server', 'custom_api', 'manual_log')
environment text check in ('production', 'staging', 'development') default 'production'
endpoint_url text
method text check in ('GET', 'POST', 'PUT', 'PATCH') default 'GET'
auth_type text check in ('none', 'bearer', 'api_key_header', 'basic') default 'none'
encrypted_auth_config jsonb
check_frequency_minutes integer default 60
status text check in ('healthy', 'degraded', 'failed', 'unknown') default 'unknown'
pass_rate numeric default 0
latency_ms integer default 0
monthly_cost numeric default 0
last_check_at timestamptz
included_in_reports boolean default true
archived_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

`archived_at` removes workflows from active app views without deleting historical check runs, issues, or reports.

## workflow_api_keys

Stores workflow-scoped API keys for external run logging.

```txt
id uuid primary key
agency_id uuid references agencies(id)
workflow_id uuid references workflows(id)
name text not null
key_prefix text not null
key_hash text unique not null
last_used_at timestamptz
revoked_at timestamptz
expires_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

Plaintext keys are never stored. The UI only displays the plaintext value immediately after rotation, then stores a non-secret prefix for identification.

## RLS and onboarding helpers

Milestones 1-3 add Supabase RLS to tenant-owned tables and helper functions:

```txt
is_agency_member(target_agency_id uuid)
has_agency_role(target_agency_id uuid, allowed_roles text[])
create_agency_for_current_user(agency_name text, agency_slug text, agency_primary_color text)
```

`create_agency_for_current_user` creates the agency and first owner membership atomically so direct membership inserts are not opened to unauthenticated or unrelated users.

Tenant-owned child records also use composite foreign keys with `agency_id` where practical. For example, a workflow references `(client_id, agency_id) -> clients(id, agency_id)`, and check runs reference tenant-matched client, workflow, and check rows. This prevents a row in one agency from pointing at another agency's object by UUID.

## checks

Represents a health check or assertion set for a workflow.

```txt
id uuid primary key
agency_id uuid references agencies(id)
workflow_id uuid references workflows(id)
name text not null
type text check in ('health', 'synthetic', 'schema', 'latency', 'cost', 'ai_judge')
config_json jsonb not null
enabled boolean default true
schedule text
created_at timestamptz default now()
updated_at timestamptz default now()
```

## check_runs

Represents one executed check.

```txt
id uuid primary key
agency_id uuid references agencies(id)
client_id uuid references clients(id)
workflow_id uuid references workflows(id)
check_id uuid references checks(id)
status text check in ('healthy', 'degraded', 'failed', 'skipped')
status_code integer
latency_ms integer
response_summary text
assertion_results_json jsonb
error_message text
cost_estimate numeric
model text
prompt_version text
trigger text check in ('manual', 'scheduled') default 'manual'
scheduled_for timestamptz
started_at timestamptz
completed_at timestamptz
created_at timestamptz default now()
```

Milestone 4 scheduled checks add `trigger` and `scheduled_for`. Scheduled runs have a unique database index on `(agency_id, check_id, scheduled_for)` where `trigger = 'scheduled'`, which makes repeated scheduler calls for the same five-minute execution window idempotent.

External run logs are stored as normal manual check runs under an "External run log" check. `model`, `prompt_version`, and `cost_estimate` support model/prompt comparison and monthly report evidence.

## issues

Represents a maintenance problem created from a failed/degraded check.

```txt
id uuid primary key
agency_id uuid references agencies(id)
client_id uuid references clients(id)
workflow_id uuid references workflows(id)
check_run_id uuid references check_runs(id)
test_run_id uuid nullable -- composite fk (test_run_id, agency_id) -> test_runs(id, agency_id)
fingerprint text
severity text check in ('low', 'medium', 'high', 'critical')
status text check in ('open', 'in_review', 'snoozed', 'resolved', 'ignored') default 'open'
title text not null
description text
suggested_action text
owner_user_id uuid references profiles(id)
reportable boolean default true
last_seen_at timestamptz default now()
occurrence_count integer default 1
alert_sent_at timestamptz
alert_delivery_id text
alert_error text
alert_last_attempt_at timestamptz
resolved_at timestamptz
resolution_note text
snoozed_until timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

Milestone 4 adds `fingerprint`, `last_seen_at`, and `occurrence_count` to dedupe repeated active failures. The active issue fingerprint is unique per agency/workflow while issue status is `open`, `in_review`, or `snoozed`; a materially different failure can create a separate issue.

Milestone 4 alerts add `alert_sent_at`, `alert_delivery_id`, `alert_error`, and `alert_last_attempt_at`. These fields track high/critical issue email delivery without storing email bodies or raw payload data.

Milestone 5 adds nullable `test_run_id` for issues created by synthetic test failures. The foreign key includes `agency_id` so an issue cannot point at another tenant's test run.

## test_packs

Represents a group of synthetic tests for a workflow.

```txt
id uuid primary key
agency_id uuid references agencies(id)
workflow_id uuid references workflows(id)
name text not null
description text
enabled boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

## test_cases

Represents one synthetic test case.

```txt
id uuid primary key
agency_id uuid references agencies(id)
workflow_id uuid references workflows(id)
test_pack_id uuid references test_packs(id)
name text not null
input_json jsonb not null
expected_json jsonb
assertions_json jsonb not null
archived_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

## test_runs

Represents execution of a test case.

```txt
id uuid primary key
agency_id uuid references agencies(id)
workflow_id uuid references workflows(id)
test_pack_id uuid references test_packs(id)
test_case_id uuid references test_cases(id)
status text check in ('passed', 'failed', 'skipped')
status_code integer
latency_ms integer
response_summary text
assertion_results_json jsonb
error_message text
created_at timestamptz default now()
```

Milestone 5 test-pack tables use RLS plus composite tenant foreign keys for `(workflow_id, agency_id)`, `(test_pack_id, agency_id)`, and `(test_case_id, agency_id)`. The Checks page derives pack case counts, pass rate, and latest run time from stored `test_cases` and `test_runs`.

## reports

Represents a monthly proof report.

```txt
id uuid primary key
agency_id uuid references agencies(id)
client_id uuid references clients(id)
period_start date not null
period_end date not null
status text check in ('draft', 'ready_to_send', 'sent', 'failed') default 'draft'
period text not null
period_label text not null
summary text
metrics_json jsonb
recommendations_json jsonb
pdf_url text
pdf_storage_path text
email_delivery_id text
send_error text
generated_at timestamptz
sent_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

## report_items

Represents stored, report-safe modules rendered in the preview and PDF.

```txt
id uuid primary key
agency_id uuid references agencies(id)
report_id uuid references reports(id)
category text check in ('workflow_health', 'issues_caught', 'issues_resolved', 'qa_checks', 'model_prompt_changes', 'recommendation')
title text not null
body text not null
metadata_json jsonb
sort_order integer
created_at timestamptz default now()
```

Milestone 6 creates a private Supabase Storage bucket named `reports`. Generated PDF files are stored under `agency_id/report_id.pdf` and downloaded through an authenticated app route rather than a public bucket URL.

## audit_events

Records important user/system actions. App server code writes these with the service-role client; agency members can read their own agency's audit history through RLS. Metadata is recursively redacted before persistence.

```txt
id uuid primary key
agency_id uuid references agencies(id)
actor_user_id uuid references profiles(id)
action text check in (
  'workflow.created',
  'workflow.updated',
  'workflow.archived',
  'check.updated',
  'check.run',
  'check.disabled',
  'test_pack.updated',
  'test_pack.disabled',
  'test_case.updated',
  'test_case.archived',
  'issue.assigned',
  'issue.resolved',
  'issue.ignored',
  'issue.snoozed',
  'report.generated',
  'report.pdf_generated',
  'report.send_attempted',
  'billing.webhook_processed'
)
target_type text check in ('workflow', 'check', 'test_pack', 'test_case', 'issue', 'report', 'billing_event')
target_id text
metadata_json jsonb default '{}'
created_at timestamptz default now()
```

The code hardening migration also adds a service-only `delete_old_check_runs(older_than interval, max_delete integer)` retention helper and indexes for workflow health summaries, due checks, check history, issue queues, report lists, test runs, and audit history.

## rate_limit_buckets

Stores hashed fixed-window counters for sensitive actions and public/protected routes. Bucket keys include a normalized scope plus a SHA-256 hash of the identifier, so API keys, emails, and user identifiers are not stored in plaintext.

```txt
bucket_key text primary key
request_count integer default 0
window_started_at timestamptz default now()
updated_at timestamptz default now()
```

`rate_limit_buckets` has RLS enabled and is granted only to `service_role`. App code consumes counters through `public.consume_rate_limit(bucket_key, limit, window_seconds)`, which runs as `security invoker` with a fixed empty search path and is executable only by `service_role`.

## Scheduler functions

Supabase Cron triggers scheduled checks through database functions rather than a separate job provider.

```txt
public.trigger_due_check_sweep() returns bigint
public.configure_due_check_cron(schedule_expression text default '*/5 * * * *') returns text
public.get_due_health_checks(p_now timestamptz, p_limit integer, p_check_id uuid, p_exclude_check_ids uuid[]) returns table
```

`trigger_due_check_sweep()` reads `tuesdayops_app_url` and `tuesdayops_scheduler_secret` from Supabase Vault, then calls the protected Next.js scheduler route with `pg_net`. `get_due_health_checks()` selects enabled health checks whose latest completed run is older than their workflow frequency, so large tenants are not scanned through an arbitrary app-side batch. The optional `p_exclude_check_ids` argument lets one scheduler sweep page past checks already attempted in that sweep, including checks that remain due because their execution failed before a run could be persisted. These functions revoke execution from `public`, `anon`, and `authenticated`, and grant execution to `service_role`.

Monthly report draft automation is app-side today. The protected route is `POST /api/scheduler/run-monthly-reports`, and it uses `clients.report_automation_enabled`, `clients.next_report_due_on`, and `clients.last_report_generated_at` to generate due prior-month report drafts.

## billing_events

Records processed Stripe webhook event IDs so billing webhooks are idempotent.

```txt
id text primary key -- Stripe event id
agency_id uuid references agencies(id)
type text not null
processed_at timestamptz default now()
created_at timestamptz default now()
```

`billing_events` has RLS enabled and is only granted to `service_role`; users do not read webhook event records through the app.
