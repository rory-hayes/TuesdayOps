"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";

const issueIdSchema = z.object({
  issueId: z.string().uuid(),
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
