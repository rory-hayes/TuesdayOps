"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { canCreateClient } from "@/lib/billing/limits";
import { sanitizeUserText } from "@/lib/domain/input-sanitization";
import { parseOptionalSlug } from "@/lib/domain/slug";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const sanitizedText = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === "string" ? sanitizeUserText(value) : value),
    schema,
  );

const clientFormSchema = z.object({
  name: sanitizedText(z.string().min(2).max(100)),
  slug: z.string().trim().max(100).optional(),
  industry: sanitizedText(z.string().min(2).max(80)),
  reportRecipientEmail: z.string().trim().email(),
  notes: sanitizedText(z.string().max(1000)).optional(),
});

const clientIdSchema = z.object({
  id: z.string().uuid(),
});

export async function createClientAction(formData: FormData) {
  const parsed = clientFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/clients?error=${encodeURIComponent("Add a client name, industry, and report email.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", workspace.agency.id)
    .is("archived_at", null);

  if (countError) {
    redirect(`/clients?error=${encodeURIComponent(formatActionError(countError, "Client count could not be loaded."))}`);
  }

  const limitDecision = canCreateClient({
    plan: workspace.agency.plan,
    billingStatus: workspace.agency.billingStatus,
    activeClients: count ?? 0,
  });

  if (!limitDecision.allowed) {
    redirect(`/clients?error=${encodeURIComponent(limitDecision.upgradeMessage ?? "Upgrade required.")}`);
  }

  const parsedSlug = parseOptionalSlug({
    value: parsed.data.slug,
    source: parsed.data.name,
    fallback: "client",
  });

  if (!parsedSlug.success) {
    redirect(`/clients?error=${encodeURIComponent(parsedSlug.message)}`);
  }

  const { error } = await createAdminClient().from("clients").insert({
    agency_id: workspace.agency.id,
    name: parsed.data.name,
    slug: parsedSlug.slug,
    industry: parsed.data.industry,
    report_recipient_email: parsed.data.reportRecipientEmail,
    notes: parsed.data.notes ?? "",
  });

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(formatActionError(error, "Client could not be created."))}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients?notice=${encodeURIComponent("Client added.")}`);
}

export async function updateClientAction(formData: FormData) {
  const parsed = clientFormSchema
    .extend({
      id: z.string().uuid(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/clients?error=${encodeURIComponent("Client update did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const parsedSlug = parseOptionalSlug({
    value: parsed.data.slug,
    source: parsed.data.name,
    fallback: "client",
  });

  if (!parsedSlug.success) {
    redirect(`/clients?error=${encodeURIComponent(parsedSlug.message)}`);
  }

  const updateResult = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      slug: parsedSlug.slug,
      industry: parsed.data.industry,
      report_recipient_email: parsed.data.reportRecipientEmail,
      notes: parsed.data.notes ?? "",
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Client was not found or is not accessible.");
  } catch (error) {
    redirect(`/clients?error=${encodeURIComponent(formatActionError(error, "Client could not be saved."))}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients?notice=${encodeURIComponent("Client saved.")}`);
}

export async function archiveClientAction(formData: FormData) {
  const parsed = clientIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/clients?error=${encodeURIComponent("Client id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const archiveResult = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(archiveResult, "Client was not found or is not accessible.");
  } catch (error) {
    redirect(`/clients?error=${encodeURIComponent(formatActionError(error, "Client could not be archived."))}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients?notice=${encodeURIComponent("Client archived.")}`);
}
