"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { checkConfigSchema } from "@/lib/checks/assertions";
import { runHttpCheck, type WorkflowAuthConfig } from "@/lib/checks/runner";
import { decryptJsonPayload, type EncryptedJsonPayload } from "@/lib/security/secrets";
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

type CheckRunWorkflowRow = {
  id: string;
  agency_id: string;
  client_id: string;
  endpoint_url: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  auth_type: "none" | "bearer" | "api_key_header" | "basic";
  encrypted_auth_config: EncryptedJsonPayload | null;
};

type CheckRunCheckRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  config_json: unknown;
  workflows: CheckRunWorkflowRow | CheckRunWorkflowRow[];
};

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
  const { data, error } = await supabase
    .from("checks")
    .select(
      "id, agency_id, workflow_id, config_json, workflows(id, agency_id, client_id, endpoint_url, method, auth_type, encrypted_auth_config)",
    )
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.checkId)
    .single();

  if (error || !data) {
    redirect(`/checks?error=${encodeURIComponent(error?.message ?? "Check could not be found.")}`);
  }

  const check = data as CheckRunCheckRow;
  const workflow = Array.isArray(check.workflows) ? check.workflows[0] : check.workflows;

  if (!workflow) {
    redirect(`/checks?error=${encodeURIComponent("Workflow could not be loaded for this check.")}`);
  }

  const authConfig = workflow.encrypted_auth_config
    ? decryptJsonPayload<WorkflowAuthConfig>(workflow.encrypted_auth_config)
    : { type: "none" as const };
  const result = await runHttpCheck({
    workflow: {
      endpointUrl: workflow.endpoint_url,
      method: workflow.method,
      authType: workflow.auth_type,
    },
    check: {
      configJson: check.config_json,
    },
    authConfig,
  });

  const { error: runError } = await supabase.from("check_runs").insert({
    agency_id: workspace.agency.id,
    client_id: workflow.client_id,
    workflow_id: workflow.id,
    check_id: check.id,
    status: result.status,
    status_code: result.statusCode,
    latency_ms: result.latencyMs,
    response_summary: result.responseSummary,
    assertion_results_json: result.assertionResults,
    error_message: result.errorMessage,
    started_at: result.startedAt,
    completed_at: result.completedAt,
  });

  if (runError) {
    redirect(`/workflows/${workflow.id}?error=${encodeURIComponent(runError.message)}`);
  }

  const { data: recentRuns } = await supabase
    .from("check_runs")
    .select("status, latency_ms")
    .eq("agency_id", workspace.agency.id)
    .eq("workflow_id", workflow.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const passRate = recentRuns?.length
    ? Math.round(
        (recentRuns.filter((run) => run.status === "healthy").length / recentRuns.length) * 100,
      )
    : result.status === "healthy"
      ? 100
      : 0;

  await supabase
    .from("workflows")
    .update({
      status: result.status,
      pass_rate: passRate,
      latency_ms: result.latencyMs,
      last_check_at: result.completedAt,
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", workflow.id);

  revalidatePath("/checks");
  revalidatePath(`/workflows/${workflow.id}`);
  revalidatePath("/workflows");
  revalidatePath("/");
  redirect(`/workflows/${workflow.id}`);
}
