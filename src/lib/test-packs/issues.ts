import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSyntheticIssueDraft,
  buildSyntheticIssueUpdateForRepeatFailure,
  type TestRunStatus,
} from "@/lib/test-packs/runner";

type SyntheticIssueSyncContext = {
  agencyId: string;
  clientId: string;
  workflowId: string;
  workflowName: string;
  testPackId: string;
  testPackName: string;
  testCaseId: string;
  testCaseName: string;
  testRunId: string;
  status: TestRunStatus;
  errorMessage?: string;
};

type ActiveSyntheticIssueRow = {
  id: string;
  occurrence_count: number | null;
};

export async function syncSyntheticIssueForTestRun({
  supabase,
  context,
  now = new Date().toISOString(),
}: {
  supabase: SupabaseClient;
  context: SyntheticIssueSyncContext;
  now?: string;
}) {
  const draft = buildSyntheticIssueDraft(context);
  const fingerprint = buildSyntheticIssueFingerprint(context);

  if (!draft) {
    if (context.status !== "passed") {
      return null;
    }

    return resolveActiveSyntheticIssue({
      supabase,
      agencyId: context.agencyId,
      workflowId: context.workflowId,
      fingerprint,
      testRunId: context.testRunId,
      now,
    });
  }

  const existing = await findActiveSyntheticIssue({
    supabase,
    agencyId: context.agencyId,
    workflowId: context.workflowId,
    fingerprint,
  });

  if (existing) {
    const { data, error } = await supabase
      .from("issues")
      .update(
        buildSyntheticIssueUpdateForRepeatFailure({
          testRunId: context.testRunId,
          draft,
          existing: { occurrenceCount: existing.occurrence_count },
          now,
        }),
      )
      .eq("agency_id", context.agencyId)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Unable to update synthetic issue: ${error.message}`);
    }

    return { id: data.id as string, created: false };
  }

  const inserted = await insertSyntheticIssue({ supabase, context, draft, now });

  if (inserted.errorCode === "23505") {
    const retryExisting = await findActiveSyntheticIssue({
      supabase,
      agencyId: context.agencyId,
      workflowId: context.workflowId,
      fingerprint,
    });

    if (retryExisting) {
      const { data, error } = await supabase
        .from("issues")
        .update(
          buildSyntheticIssueUpdateForRepeatFailure({
            testRunId: context.testRunId,
            draft,
            existing: { occurrenceCount: retryExisting.occurrence_count },
            now,
          }),
        )
        .eq("agency_id", context.agencyId)
        .eq("id", retryExisting.id)
        .select("id")
        .single();

      if (error) {
        throw new Error(`Unable to update synthetic issue: ${error.message}`);
      }

      return { id: data.id as string, created: false };
    }
  }

  if (inserted.errorMessage) {
    throw new Error(`Unable to create synthetic issue: ${inserted.errorMessage}`);
  }

  return { id: inserted.id, created: true };
}

function buildSyntheticIssueFingerprint({
  testPackId,
  testCaseId,
}: {
  testPackId: string;
  testCaseId: string;
}) {
  return `synthetic:${testPackId}:${testCaseId}:failed`;
}

async function resolveActiveSyntheticIssue({
  supabase,
  agencyId,
  workflowId,
  fingerprint,
  testRunId,
  now,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  workflowId: string;
  fingerprint: string;
  testRunId: string;
  now: string;
}) {
  const existing = await findActiveSyntheticIssue({
    supabase,
    agencyId,
    workflowId,
    fingerprint,
  });

  if (!existing) {
    return null;
  }

  const { data, error } = await supabase
    .from("issues")
    .update({
      test_run_id: testRunId,
      status: "resolved",
      resolved_at: now,
      resolution_note: "Synthetic test passed on rerun.",
      reportable: true,
    })
    .eq("agency_id", agencyId)
    .eq("id", existing.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to resolve synthetic issue: ${error.message}`);
  }

  return { id: data.id as string, resolved: true };
}

async function findActiveSyntheticIssue({
  supabase,
  agencyId,
  workflowId,
  fingerprint,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  workflowId: string;
  fingerprint: string;
}) {
  const { data, error } = await supabase
    .from("issues")
    .select("id, occurrence_count")
    .eq("agency_id", agencyId)
    .eq("workflow_id", workflowId)
    .eq("fingerprint", fingerprint)
    .in("status", ["open", "in_review"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check active synthetic issues: ${error.message}`);
  }

  return data as ActiveSyntheticIssueRow | null;
}

async function insertSyntheticIssue({
  supabase,
  context,
  draft,
  now,
}: {
  supabase: SupabaseClient;
  context: SyntheticIssueSyncContext;
  draft: NonNullable<ReturnType<typeof buildSyntheticIssueDraft>>;
  now: string;
}) {
  const { data, error } = await supabase
    .from("issues")
    .insert({
      agency_id: context.agencyId,
      client_id: context.clientId,
      workflow_id: context.workflowId,
      test_run_id: context.testRunId,
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
