"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { buildRunLogApiKeyRecord, generateRunLogApiKey } from "@/lib/run-logs/api-keys";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import { createClient } from "@/lib/supabase/server";

type RunLogKeyActionState = {
  notice?: string;
  error?: string;
  apiKey?: string;
  keyPrefix?: string;
};

const workflowIdSchema = z.object({
  workflowId: z.string().uuid(),
});

export async function rotateWorkflowRunLogKeyAction(
  _state: RunLogKeyActionState | null,
  formData: FormData,
): Promise<RunLogKeyActionState> {
  const parsed = workflowIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Workflow could not be found. Refresh the page and try again." };
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();

  try {
    await assertWorkflowAccessible({
      supabase,
      agencyId: workspace.agency.id,
      workflowId: parsed.data.workflowId,
    });

    const now = new Date().toISOString();
    await supabase
      .from("workflow_api_keys")
      .update({ revoked_at: now })
      .eq("agency_id", workspace.agency.id)
      .eq("workflow_id", parsed.data.workflowId)
      .is("revoked_at", null);

    const key = generateRunLogApiKey();
    const { error } = await supabase.from("workflow_api_keys").insert(buildRunLogApiKeyRecord({
      agencyId: workspace.agency.id,
      workflowId: parsed.data.workflowId,
      key,
      name: "External run logger",
    }));

    if (error) {
      throw error;
    }

    revalidatePath(`/workflows/${parsed.data.workflowId}`);

    return {
      notice: "Run-log API key rotated. Store this key now; it will not be shown again.",
      apiKey: key.plaintext,
      keyPrefix: key.prefix,
    };
  } catch (error) {
    return { error: formatActionError(error, "Run-log API key could not be rotated. Refresh the page and try again.") };
  }
}

export async function revokeWorkflowRunLogKeysAction(
  _state: RunLogKeyActionState | null,
  formData: FormData,
): Promise<RunLogKeyActionState> {
  const parsed = workflowIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Workflow could not be found. Refresh the page and try again." };
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();

  try {
    await assertWorkflowAccessible({
      supabase,
      agencyId: workspace.agency.id,
      workflowId: parsed.data.workflowId,
    });

    await supabase
      .from("workflow_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("agency_id", workspace.agency.id)
      .eq("workflow_id", parsed.data.workflowId)
      .is("revoked_at", null);

    revalidatePath(`/workflows/${parsed.data.workflowId}`);

    return { notice: "Active run-log API keys revoked." };
  } catch (error) {
    return { error: formatActionError(error, "Run-log API keys could not be revoked. Refresh the page and try again.") };
  }
}

async function assertWorkflowAccessible({
  supabase,
  agencyId,
  workflowId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  agencyId: string;
  workflowId: string;
}) {
  const result = await supabase
    .from("workflows")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("id", workflowId)
    .is("archived_at", null)
    .maybeSingle();

  assertMutationTouchedRow(result, "Workflow was not found or is not accessible.");
}
