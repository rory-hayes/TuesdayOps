"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
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
  action: "issue.assigned" | "issue.resolved" | "issue.ignored";
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
