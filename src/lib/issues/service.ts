"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import { executeCheckRun } from "@/lib/checks/execution";
import { assertManualCheckRunRateLimit } from "@/lib/checks/rate-limits";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const issueIdSchema = z.object({
  issueId: z.string().uuid(),
  returnTo: z.string().trim().optional(),
});

const resolveIssueSchema = issueIdSchema.extend({
  resolutionNote: z.string().trim().min(3).max(600),
});

const reportableIssueSchema = issueIdSchema.extend({
  reportable: z.enum(["true", "false"]),
});

const snoozeIssueSchema = issueIdSchema.extend({
  snoozeDays: z.coerce.number().int().min(1).max(30).default(7),
});

export async function assignIssueToMeAction(formData: FormData) {
  const parsed = issueIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const updateResult = await supabase
    .from("issues")
    .update({ owner_user_id: workspace.user.id, status: "in_review" })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Issue was not found or is not accessible.");
  } catch (error) {
    redirect(buildIssueErrorRedirect("/issues", formatActionError(error, "Issue could not be assigned.")));
  }
  await recordIssueAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    issueId: parsed.data.issueId,
    action: "issue.assigned",
    metadata: { status: "in_review" },
  });

  revalidatePath("/issues");
  revalidatePath("/");
  redirect(buildIssueRedirect(parsed.data.returnTo, "/issues?status=in_review", "Issue assigned."));
}

export async function rerunIssueCheckAction(formData: FormData) {
  const parsed = issueIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  let workflowId: string | undefined;

  try {
    await assertManualCheckRunRateLimit({
      agencyId: workspace.agency.id,
      userId: workspace.user.id,
    });

    const issue = await loadIssueRerunContext({
      supabase,
      agencyId: workspace.agency.id,
      issueId: parsed.data.issueId,
    });
    workflowId = issue.workflowId;
    const result = await executeCheckRun({
      supabase,
      agencyId: workspace.agency.id,
      checkId: issue.checkId,
      trigger: "manual",
    });

    await recordIssueRerunAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      issueId: parsed.data.issueId,
      checkId: issue.checkId,
      checkRunId: result.status === "completed" ? result.checkRunId : null,
      runStatus: result.status === "completed" ? result.runStatus : result.status,
    });
  } catch (error) {
    redirect(buildIssueErrorRedirect(
      parsed.data.returnTo?.startsWith("/issues/") ? parsed.data.returnTo : "/issues",
      formatActionError(error, "Issue check could not be rerun."),
    ));
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${parsed.data.issueId}`);
  if (workflowId) {
    revalidatePath(`/workflows/${workflowId}`);
  }
  revalidatePath("/workflows");
  revalidatePath("/");
  redirect(buildIssueRedirect(parsed.data.returnTo, "/issues", "Check rerun completed."));
}

export async function resolveIssueAction(formData: FormData) {
  const parsed = resolveIssueSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Add a resolution note before resolving.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const updateResult = await supabase
    .from("issues")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolution_note: parsed.data.resolutionNote,
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Issue was not found or is not accessible.");
  } catch (error) {
    redirect(buildIssueErrorRedirect("/issues", formatActionError(error, "Issue could not be resolved.")));
  }
  await recordIssueAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    issueId: parsed.data.issueId,
    action: "issue.resolved",
    metadata: { status: "resolved" },
  });

  revalidatePath("/issues");
  revalidatePath("/");
  redirect(buildIssueRedirect(parsed.data.returnTo, "/issues?status=resolved", "Issue resolved."));
}

export async function setIssueReportableAction(formData: FormData) {
  const parsed = reportableIssueSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue report setting was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const reportable = parsed.data.reportable === "true";
  const updateResult = await supabase
    .from("issues")
    .update({ reportable })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Issue was not found or is not accessible.");
  } catch (error) {
    redirect(buildIssueErrorRedirect("/issues", formatActionError(error, "Issue report setting could not be saved.")));
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${parsed.data.issueId}`);
  revalidatePath("/reports");
  revalidatePath("/");
  redirect(buildIssueRedirect(
    parsed.data.returnTo,
    "/issues",
    reportable ? "Issue marked reportable." : "Issue excluded from reports.",
  ));
}

export async function ignoreIssueAction(formData: FormData) {
  const parsed = issueIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const updateResult = await supabase
    .from("issues")
    .update({
      status: "ignored",
      reportable: false,
      resolved_at: new Date().toISOString(),
      resolution_note: "Ignored for reporting.",
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Issue was not found or is not accessible.");
  } catch (error) {
    redirect(buildIssueErrorRedirect("/issues", formatActionError(error, "Issue could not be ignored.")));
  }
  await recordIssueAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    issueId: parsed.data.issueId,
    action: "issue.ignored",
    metadata: { status: "ignored", reportable: false },
  });

  revalidatePath("/issues");
  revalidatePath("/");
  redirect(buildIssueRedirect(parsed.data.returnTo, "/issues?status=ignored", "Issue ignored."));
}

export async function snoozeIssueAction(formData: FormData) {
  const parsed = snoozeIssueSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent("Issue snooze details were invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const snoozedUntil = new Date(Date.now() + parsed.data.snoozeDays * 24 * 60 * 60 * 1000).toISOString();
  const updateResult = await supabase
    .from("issues")
    .update({
      status: "snoozed",
      snoozed_until: snoozedUntil,
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.issueId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Issue was not found or is not accessible.");
  } catch (error) {
    redirect(buildIssueErrorRedirect("/issues", formatActionError(error, "Issue could not be snoozed.")));
  }
  await recordIssueAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    issueId: parsed.data.issueId,
    action: "issue.snoozed",
    metadata: { status: "snoozed", snoozedUntil },
  });

  revalidatePath("/issues");
  revalidatePath(`/issues/${parsed.data.issueId}`);
  revalidatePath("/");
  redirect(buildIssueRedirect(parsed.data.returnTo, "/issues?status=snoozed", "Issue snoozed."));
}

async function loadIssueRerunContext({
  supabase,
  agencyId,
  issueId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  agencyId: string;
  issueId: string;
}) {
  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("id, workflow_id, check_run_id")
    .eq("agency_id", agencyId)
    .eq("id", issueId)
    .maybeSingle();

  if (issueError || !issue) {
    throw new Error(issueError?.message ?? "Issue was not found or is not accessible.");
  }

  const checkRunId = (issue as { check_run_id?: string | null }).check_run_id;

  if (!checkRunId) {
    throw new Error("This issue is not linked to a health check run.");
  }

  const { data: checkRun, error: runError } = await supabase
    .from("check_runs")
    .select("check_id")
    .eq("agency_id", agencyId)
    .eq("id", checkRunId)
    .maybeSingle();

  if (runError || !checkRun) {
    throw new Error(runError?.message ?? "Issue source check run could not be found.");
  }

  const checkId = (checkRun as { check_id?: string | null }).check_id;

  if (!checkId) {
    throw new Error("Issue source check run is missing a check reference.");
  }

  return {
    checkId,
    workflowId: (issue as { workflow_id: string }).workflow_id,
  };
}

function buildIssueRedirect(returnTo: string | undefined, fallback: string, notice: string) {
  if (returnTo?.startsWith("/issues/")) {
    return `${returnTo}?notice=${encodeURIComponent(notice)}`;
  }

  const separator = fallback.includes("?") ? "&" : "?";
  return `${fallback}${separator}notice=${encodeURIComponent(notice)}`;
}

function buildIssueErrorRedirect(fallback: string, message: string) {
  const separator = fallback.includes("?") ? "&" : "?";
  return `${fallback}${separator}error=${encodeURIComponent(message)}`;
}

async function recordIssueAuditEvent({
  agencyId,
  actorUserId,
  issueId,
  action,
  metadata,
}: {
  agencyId: string;
  actorUserId: string;
  issueId: string;
  action: "issue.assigned" | "issue.resolved" | "issue.ignored" | "issue.snoozed";
  metadata: Record<string, unknown>;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId,
      actorUserId,
      action,
      targetType: "issue",
      targetId: issueId,
      metadata,
    });
  } catch {
    // Audit logging must not block issue queue actions.
  }
}

async function recordIssueRerunAuditEvent({
  agencyId,
  actorUserId,
  issueId,
  checkId,
  checkRunId,
  runStatus,
}: {
  agencyId: string;
  actorUserId: string;
  issueId: string;
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
        trigger: "issue_rerun",
        issueId,
        checkRunId,
        runStatus,
      },
    });
  } catch {
    // Audit logging must not block issue reruns.
  }
}
