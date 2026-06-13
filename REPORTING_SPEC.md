# TuesdayOps Reporting Spec

Reports are the core value of TuesdayOps. They turn invisible maintenance into visible client value.

## Report purpose

The monthly report should answer:

1. What did we monitor?
2. What stayed healthy?
3. What broke or degraded?
4. What did we fix?
5. What did we improve?
6. What should happen next?

## Report audience

- client stakeholder
- agency account manager
- agency founder
- client ops/technical owner

## Report tone

Clear, client-safe, non-technical where possible.

Avoid:

- stack traces
- raw payloads
- excessive AI terminology
- internal agency notes

## Report sections

### 1. Cover

Fields:

- agency logo
- client logo/name
- report month
- report title
- prepared by
- generated date

### 2. Executive summary

Plain-English summary.

Example:

```txt
This month, we monitored 8 AI workflows for Acme Marketing. Overall workflow health remained strong at 94.2%. TuesdayOps detected 6 issues, all of which were resolved before major client impact. We also validated 4 model/prompt changes and recommend adding retry logic to the Lead Generation AI workflow next month.
```

### 3. Workflow health overview

Metrics:

- workflows monitored
- average health score
- uptime
- check pass rate
- failed checks
- degraded checks

### 4. Issues caught

Show:

- issue count by severity
- top issue categories
- notable issues
- time to resolution

### 5. Issues resolved

Show:

- what was fixed
- when it was fixed
- impact avoided
- resolution notes marked reportable

### 6. QA checks run

Show:

- test packs run
- total tests
- pass/fail count
- key failed cases

### 7. Model/prompt changes tested

Show:

- changes tested
- pass rate before/after
- latency/cost difference
- recommendation

### 8. Value delivered

MVP estimate fields:

- hours saved estimate
- issues prevented
- monitoring coverage
- report period uptime

### 9. Recommendations

Generated from recurring issue patterns.

Examples:

- Add retry logic to Lead Generation AI.
- Increase timeout threshold for Content Pipeline.
- Refresh source data weekly.
- Expand QA coverage for output formatting.

## Report statuses

```txt
draft
ready_to_send
sent
failed
```

## PDF generation

MVP should support:

- web preview
- generate PDF
- store PDF URL
- download PDF
- send PDF by email

## White-label settings

Agency can configure:

- logo
- footer text
- report sender name
- report sender email later

## Report-safe data rules

Include:

- summaries
- counts
- safe issue titles
- resolution summaries
- high-level recommendations

Exclude:

- raw request/response body
- secrets
- internal notes not marked reportable
- client PII unless explicitly included by agency
