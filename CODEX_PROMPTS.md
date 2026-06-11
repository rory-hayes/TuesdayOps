# Codex Prompts for TuesdayOps

## Initial repository setup prompt

Use this when starting from a blank repo.

```txt
You are building TuesdayOps, a SaaS MVP for AI agencies to monitor client AI workflows, run lightweight QA checks, detect failures, and generate white-label monthly proof-of-work reports.

Before coding, read these files fully:
- README.md
- AGENTS.md
- PRD.md
- ARCHITECTURE.md
- DATA_MODEL.md
- TECH_STACK.md
- TASKS.md
- ACCEPTANCE_CRITERIA.md
- SECURITY.md

Implement only Milestone 0 from TASKS.md.

Do not build extra product features. Do not drift into a generic evals platform, client portal, or agency CRM.

After implementation:
- run lint/typecheck/tests if available
- update TASKS.md statuses
- update README.md with setup instructions
- summarize files changed and next recommended ticket
```

## Repeatable implementation prompt

Use this for each task.

```txt
Read AGENTS.md, TASKS.md, ACCEPTANCE_CRITERIA.md, ARCHITECTURE.md, and the relevant docs before making changes.

Pick the next incomplete task from TASKS.md under the current milestone and implement it fully.

Rules:
- implement only this task
- add tests where feasible
- keep tenant isolation and security in mind
- update docs if behavior/schema/env changes
- update TASKS.md status
- run lint/typecheck/test if available
- stop when done and summarize changes
```

## Bug fix prompt

```txt
Investigate and fix the reported bug without changing unrelated behavior.

Before editing, identify:
- affected files
- likely cause
- expected behavior
- acceptance criteria

After fixing:
- add or update tests to prevent regression
- run lint/typecheck/test
- update CHANGELOG.md if user-facing behavior changed
```

## Refactor prompt

```txt
Refactor the specified area while preserving behavior.

Constraints:
- no product scope changes
- no schema changes unless requested
- no UI redesign unless requested
- add tests if existing behavior is not covered
- keep public APIs stable unless explicitly asked
```

## Report generation prompt

```txt
Build or update the TuesdayOps report generation flow.

The report must be client-safe and white-label. It should summarize workflow health, checks run, issues caught, issues resolved, test results, model/prompt changes tested, and recommendations.

Do not include raw request/response bodies, secrets, or internal-only notes.

Update REPORTING_SPEC.md if report modules change.
```
