alter table public.issues
add column if not exists maintenance_note text;

alter table public.audit_events
drop constraint if exists audit_events_action_check;

alter table public.audit_events
add constraint audit_events_action_check check (
  action in (
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
    'issue.noted',
    'issue.resolved',
    'issue.ignored',
    'issue.snoozed',
    'issue.reportable_updated',
    'report.generated',
    'report.pdf_generated',
    'report.send_attempted',
    'billing.webhook_processed'
  )
);
