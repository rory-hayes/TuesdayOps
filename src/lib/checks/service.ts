"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { checkConfigSchema } from "@/lib/checks/assertions";
import { executeCheckRun } from "@/lib/checks/execution";
import { createClient } from "@/lib/supabase/server";

const createCheckFormSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  maxLatencyMs: z.coerce.number().int().min(100).max(60000).default(5000),
  timeoutMs: z.coerce.number().int().min(1000).max(60000).default(10000),
});

const runCheckFormSchema = z.object({
  checkId: z.string().uuid(),
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
    redirect(`/checks?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/checks");
  revalidatePath(`/workflows/${parsed.data.workflowId}`);
  redirect(`/workflows/${parsed.data.workflowId}`);
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
    const result = await executeCheckRun({
      supabase,
      agencyId: workspace.agency.id,
      checkId: parsed.data.checkId,
      trigger: "manual",
    });

    workflowId = result.workflowId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check run failed.";
    redirect(`/checks?error=${encodeURIComponent(message)}`);
  }

  if (!workflowId) {
    redirect(`/checks?error=${encodeURIComponent("Check run did not return a workflow.")}`);
  }

  revalidatePath("/checks");
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/workflows");
  revalidatePath("/issues");
  revalidatePath("/");
  redirect(`/workflows/${workflowId}`);
}
