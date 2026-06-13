"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createSlug } from "@/lib/domain/slug";
import { createClient } from "@/lib/supabase/server";

const clientFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(100).optional(),
  industry: z.string().trim().min(2).max(80),
  reportRecipientEmail: z.string().trim().email(),
  notes: z.string().trim().max(1000).optional(),
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
  const slug = createSlug(parsed.data.slug || parsed.data.name, "client");
  const { error } = await supabase.from("clients").insert({
    agency_id: workspace.agency.id,
    name: parsed.data.name,
    slug,
    industry: parsed.data.industry,
    report_recipient_email: parsed.data.reportRecipientEmail,
    notes: parsed.data.notes ?? "",
  });

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
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
  const slug = createSlug(parsed.data.slug || parsed.data.name, "client");
  const { error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      slug,
      industry: parsed.data.industry,
      report_recipient_email: parsed.data.reportRecipientEmail,
      notes: parsed.data.notes ?? "",
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id);

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
}

export async function archiveClientAction(formData: FormData) {
  const parsed = clientIdSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/clients?error=${encodeURIComponent("Client id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id);

  if (error) {
    redirect(`/clients?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
}
