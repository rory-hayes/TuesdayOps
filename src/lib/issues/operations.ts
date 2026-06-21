import type { SupabaseClient } from "@supabase/supabase-js";
import { sendIssueAlertForNewIssue } from "@/lib/alerts/service";
import type { AssertionResult } from "@/lib/checks/assertions";
import type { CheckRunStatus } from "@/lib/domain/types";
import {
  buildIssueDraftFromCheckRun,
  buildIssueUpdateForRepeatFailure,
  type IssueDraft,
} from "@/lib/issues/engine";

export type IssueRunContext = {
  agencyId: string;
  clientId: string;
  workflowId: string;
  workflowName: string;
  checkId: string;
  checkName: string;
  checkRunId: string;
  status: CheckRunStatus;
  statusCode?: number;
  latencyMs: number;
  errorMessage?: string;
  assertionResults: AssertionResult[];
};

type ActiveIssueRow = {
  id: string;
  occurrence_count: number | null;
};

const reusableIssueStatuses = ["open", "in_review", "snoozed", "ignored"];

export async function createOrUpdateIssueForCheckRun({
  supabase,
  context,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
}) {
  const draft = buildIssueDraftFromCheckRun({
    checkId: context.checkId,
    checkRunId: context.checkRunId,
    status: context.status,
    statusCode: context.statusCode,
    latencyMs: context.latencyMs,
    errorMessage: context.errorMessage,
    assertionResults: context.assertionResults,
    workflowName: context.workflowName,
    checkName: context.checkName,
  });

  if (!draft) {
    return null;
  }

  return upsertActiveIssue({ supabase, context, draft });
}

async function upsertActiveIssue({
  supabase,
  context,
  draft,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
  draft: IssueDraft;
}) {
  const existing = await findActiveIssue({ supabase, context, fingerprint: draft.fingerprint });

  if (existing) {
    return updateExistingIssue({ supabase, issue: existing, context, draft });
  }

  const inserted = await insertIssue({ supabase, context, draft });

  if (inserted.errorCode === "23505") {
    const retryExisting = await findActiveIssue({ supabase, context, fingerprint: draft.fingerprint });

    if (retryExisting) {
      return updateExistingIssue({ supabase, issue: retryExisting, context, draft });
    }
  }

  if (inserted.errorMessage) {
    throw new Error(`Unable to create issue: ${inserted.errorMessage}`);
  }

  if (inserted.id) {
    await sendIssueAlertForNewIssue({
      supabase,
      issueId: inserted.id,
      created: true,
      draft,
      context,
    });
  }

  return { id: inserted.id, created: true };
}

async function findActiveIssue({
  supabase,
  context,
  fingerprint,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
  fingerprint: string;
}) {
  const { data, error } = await supabase
    .from("issues")
    .select("id, occurrence_count")
    .eq("agency_id", context.agencyId)
    .eq("workflow_id", context.workflowId)
    .eq("fingerprint", fingerprint)
    .in("status", reusableIssueStatuses)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check active issues: ${error.message}`);
  }

  return data as ActiveIssueRow | null;
}

async function updateExistingIssue({
  supabase,
  issue,
  context,
  draft,
}: {
  supabase: SupabaseClient;
  issue: ActiveIssueRow;
  context: IssueRunContext;
  draft: IssueDraft;
}) {
  const { data, error } = await supabase
    .from("issues")
    .update(
      buildIssueUpdateForRepeatFailure({
        checkRunId: context.checkRunId,
        draft,
        existing: { occurrenceCount: issue.occurrence_count },
        now: new Date().toISOString(),
      }),
    )
    .eq("agency_id", context.agencyId)
    .eq("id", issue.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update issue: ${error.message}`);
  }

  return { id: data.id as string, created: false };
}

async function insertIssue({
  supabase,
  context,
  draft,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
  draft: IssueDraft;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("issues")
    .insert({
      agency_id: context.agencyId,
      client_id: context.clientId,
      workflow_id: context.workflowId,
      check_run_id: context.checkRunId,
      fingerprint: draft.fingerprint,
      severity: draft.severity,
      status: "open",
      title: draft.title,
      description: draft.description,
      suggested_action: draft.suggestedAction,
      reportable: draft.reportable,
      last_seen_at: now,
      occurrence_count: 1,
    })
    .select("id")
    .single();

  return {
    id: data?.id as string | undefined,
    errorCode: error?.code,
    errorMessage: error?.message,
  };
}
