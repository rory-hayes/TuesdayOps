# TuesdayOps Data Model

This document defines the MVP data model.

## agencies

Represents an AI agency using TuesdayOps.

```txt
id uuid primary key
name text not null
slug text unique not null
logo_url text
primary_color text default '#6C5CE7'
plan text default 'starter'
billing_customer_id text
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
notes text
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
included_in_reports boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

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
started_at timestamptz
completed_at timestamptz
created_at timestamptz default now()
```

## issues

Represents a maintenance problem created from a failed/degraded check.

```txt
id uuid primary key
agency_id uuid references agencies(id)
client_id uuid references clients(id)
workflow_id uuid references workflows(id)
check_run_id uuid references check_runs(id)
severity text check in ('low', 'medium', 'high', 'critical')
status text check in ('open', 'in_review', 'resolved', 'ignored') default 'open'
title text not null
description text
suggested_action text
owner_user_id uuid references profiles(id)
reportable boolean default true
resolved_at timestamptz
resolution_note text
created_at timestamptz default now()
updated_at timestamptz default now()
```

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
test_pack_id uuid references test_packs(id)
name text not null
input_json jsonb not null
expected_json jsonb
assertions_json jsonb not null
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
latency_ms integer
assertion_results_json jsonb
error_message text
created_at timestamptz default now()
```

## reports

Represents a monthly proof report.

```txt
id uuid primary key
agency_id uuid references agencies(id)
client_id uuid references clients(id)
period_start date not null
period_end date not null
status text check in ('draft', 'ready_to_send', 'sent', 'failed') default 'draft'
summary text
pdf_url text
generated_at timestamptz
sent_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

## audit_events

Records important user/system actions.

```txt
id uuid primary key
agency_id uuid references agencies(id)
actor_user_id uuid references profiles(id)
event_type text not null
entity_type text
entity_id uuid
metadata_json jsonb
created_at timestamptz default now()
```
