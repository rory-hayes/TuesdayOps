import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "workflow.created"
  | "workflow.updated"
  | "check.run"
  | "issue.assigned"
  | "issue.resolved"
  | "issue.ignored"
  | "report.generated"
  | "report.pdf_generated"
  | "report.send_attempted"
  | "billing.webhook_processed";

export type AuditTargetType =
  | "workflow"
  | "check"
  | "issue"
  | "report"
  | "billing_event";

export type AuditEventInput = {
  agencyId: string;
  actorUserId?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

const sensitiveKeyPattern = /authorization|auth|bearer|secret|token|api[_-]?key|password|encrypted/i;

export function buildAuditEventInsert(input: AuditEventInput) {
  return {
    agency_id: input.agencyId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata_json: redactAuditMetadata(input.metadata ?? {}),
  };
}

export async function recordAuditEvent({
  supabase,
  ...input
}: AuditEventInput & {
  supabase: SupabaseClient;
}) {
  const { error } = await supabase.from("audit_events").insert(buildAuditEventInsert(input));

  if (error) {
    throw new Error(`Audit event could not be recorded: ${error.message}`);
  }
}

export async function recordAuditEventSafely(input: AuditEventInput & { supabase: SupabaseClient }) {
  try {
    await recordAuditEvent(input);
  } catch {
    // Audit events should never block the primary workflow/check/report action.
  }
}

function redactAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : redactAuditMetadata(item),
    ]),
  );
}
