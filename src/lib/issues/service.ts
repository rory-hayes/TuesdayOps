"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AssertionResult } from "@/lib/checks/assertions";
import type { CheckRunStatus } from "@/lib/domain/types";
import { requireWorkspace } from "@/lib/auth/workspace";
import {
  buildIssueDraftFromCheckRun,
  buildIssueUpdateForRepeatFailure,
  type IssueDraft,
} from "@/lib/issues/engine";
import { createClient } from "@/lib/supabase/server";

type IssueRunContext = {
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

const issueIdSchema = z.object({
  issueId: z.string().uuid(),
});

const resolveIssueSchema = issueIdSchema.extend({
  resolutionNote: z.string().trim().min(3).max(600),
});

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

export async function assignIssueToMeAction(formData: FormData) {
  const parsed = issueIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ owner_user_id: workspace.user.id, status: "in_review" })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId);

  if (error) {
    redirect(`/issues?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/issues");
  revalidatePath("/");
  redirect("/issues?status=in_review");
}

export async function resolveIssueAction(formData: FormData) {
  const parsed = resolveIssueSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Add a resolution note before resolving.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolution_note: parsed.data.resolutionNote,
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId);

  if (error) {
    redirect(`/issues?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/issues");
  revalidatePath("/");
  redirect("/issues?status=resolved");
}

export async function ignoreIssueAction(formData: FormData) {
  const parsed = issueIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({
      status: "ignored",
      reportable: false,
      resolved_at: new Date().toISOString(),
      resolution_note: "Ignored for reporting.",
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId);

  if (error) {
    redirect(`/issues?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/issues");
  revalidatePath("/");
  redirect("/issues?status=ignored");
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
    .in("status", ["open", "in_review"])
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
