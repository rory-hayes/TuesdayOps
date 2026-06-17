"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import { checkConfigSchema } from "@/lib/checks/assertions";
import { executeCheckRun } from "@/lib/checks/execution";
import { buildCheckDisableUpdate } from "@/lib/checks/lifecycle";
import { assertPersistentRateLimit } from "@/lib/security/rate-limit";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createCheckFormSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  maxLatencyMs: z.coerce.number().int().min(100).max(60000).default(5000),
  timeoutMs: z.coerce.number().int().min(1000).max(60000).default(10000),
  returnTab: z.enum(["overview", "checks", "api", "endpoint", "settings"]).optional(),
});

const runCheckFormSchema = z.object({
  checkId: z.string().uuid(),
  returnTab: z.enum(["overview", "checks", "api", "endpoint", "settings"]).optional(),
});

export async function createCheckAction(formData: FormData) {
  const parsed = createCheckFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Check details did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const config = checkConfigSchema.parse({
    timeoutMs: parsed.data.timeoutMs,
    assertions: [
      { type: "status_code", expected: parsed.data.expectedStatus },
      { type: "latency_under", maxMs: parsed.data.maxLatencyMs },
    ],
  });
  const { error } = await supabase.from("checks").insert({
    agency_id: workspace.agency.id,
    workflow_id: parsed.data.workflowId,
    name: parsed.data.name,
    type: "health",
    config_json: config,
    schedule: "manual",
    enabled: true,
  });

  if (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Check could not be created."))}`);
  }

  revalidatePath("/checks");
  revalidatePath(`/workflows/${parsed.data.workflowId}`);
  redirect(buildWorkflowRedirect(parsed.data.workflowId, {
    notice: "Check added.",
    tab: parsed.data.returnTab,
  }));
}

export async function runCheckAction(formData: FormData) {
  const parsed = runCheckFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Check id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  let workflowId: string | undefined;
  try {
    await assertPersistentRateLimit({
      scope: "manual-check-run",
      identifier: `${workspace.agency.id}:${workspace.user.id}`,
      limit: 20,
      windowSeconds: 600,
    });
    const result = await executeCheckRun({
      supabase,
      agencyId: workspace.agency.id,
      checkId: parsed.data.checkId,
      trigger: "manual",
    });

    workflowId = result.workflowId;
    await recordCheckRunAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      checkId: parsed.data.checkId,
      checkRunId: result.status === "completed" ? result.checkRunId : null,
      runStatus: result.status === "completed" ? result.runStatus : result.status,
    });
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Check run failed."))}`);
  }

  if (!workflowId) {
    redirect(`/checks?error=${encodeURIComponent("Check run did not return a workflow.")}`);
  }

  revalidatePath("/checks");
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/workflows");
  revalidatePath("/issues");
  revalidatePath("/");
  redirect(buildWorkflowRedirect(workflowId, {
    notice: "Check run completed and history was updated.",
    tab: parsed.data.returnTab,
  }));
}

export async function disableCheckAction(formData: FormData) {
  const parsed = runCheckFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Check id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const disableResult = await supabase
    .from("checks")
    .update(buildCheckDisableUpdate())
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.checkId)
    .select("id, workflow_id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(disableResult, "Check was not found or is not accessible.");
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Check could not be disabled."))}`);
  }

  const workflowId = (disableResult.data as { workflow_id?: string } | null)?.workflow_id;

  await recordCheckLifecycleAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    checkId: parsed.data.checkId,
    action: "check.disabled",
  });

  revalidatePath("/checks");
  if (workflowId) {
    revalidatePath(`/workflows/${workflowId}`);
  }
  revalidatePath("/workflows");
  revalidatePath("/");
  redirect(`/checks?notice=${encodeURIComponent("Check disabled. Historical run data was preserved.")}`);
}

async function recordCheckRunAuditEvent({
  agencyId,
  actorUserId,
  checkId,
  checkRunId,
  runStatus,
}: {
  agencyId: string;
  actorUserId: string;
  checkId: string;
  checkRunId: string | null;
  runStatus: string;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId,
      actorUserId,
      action: "check.run",
      targetType: "check",
      targetId: checkId,
      metadata: {
        trigger: "manual",
        checkRunId,
        runStatus,
      },
    });
  } catch {
    // Audit logging must not block check execution.
  }
}

async function recordCheckLifecycleAuditEvent({
  agencyId,
  actorUserId,
  checkId,
  action,
}: {
  agencyId: string;
  actorUserId: string;
  checkId: string;
  action: "check.disabled";
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId,
      actorUserId,
      action,
      targetType: "check",
      targetId: checkId,
      metadata: {},
    });
  } catch {
    // Audit logging must not block check lifecycle actions.
  }
}

function buildWorkflowRedirect(
  workflowId: string,
  values: {
    notice?: string;
    tab?: string;
  },
): string {
  const params = new URLSearchParams();

  if (values.tab) {
    params.set("tab", values.tab);
  }

  if (values.notice) {
    params.set("notice", values.notice);
  }

  return `/workflows/${workflowId}?${params.toString()}`;
}
