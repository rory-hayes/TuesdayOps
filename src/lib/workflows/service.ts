"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import { canCreateWorkflow } from "@/lib/billing/limits";
import { checkConfigSchema } from "@/lib/checks/assertions";
import type { WorkflowAuthConfig } from "@/lib/checks/runner";
import type { Workflow } from "@/lib/domain/types";
import {
  assertSafeWorkflowEndpoint,
  shouldAllowPrivateWorkflowEndpoints,
} from "@/lib/security/endpoint-url";
import { encryptJsonPayload } from "@/lib/security/secrets";
import { createClient } from "@/lib/supabase/server";
import { parseWorkflowImport } from "@/lib/workflows/onboarding";

const workflowBaseFormSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["http_endpoint", "webhook", "n8n", "make", "zapier", "mcp_server", "custom_api", "manual_log"]),
  environment: z.enum(["production", "staging", "development"]),
  endpointUrl: z.string().trim().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH"]),
  authType: z.enum(["none", "bearer", "api_key_header", "basic"]),
  authSecret: z.string().trim().optional(),
  authHeaderName: z.string().trim().optional(),
  basicUsername: z.string().trim().optional(),
  checkFrequencyMinutes: z.coerce.number().int().min(5).max(10080),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  maxLatencyMs: z.coerce.number().int().min(100).max(60000).default(5000),
  requestBody: z.string().trim().optional(),
});

const workflowFormSchema = workflowBaseFormSchema
  .superRefine((value, context) => {
    if (value.authType === "none") {
      return;
    }

    if (!value.authSecret) {
      context.addIssue({
        code: "custom",
        path: ["authSecret"],
        message: "Authentication secret is required.",
      });
    }

    if (value.authType === "api_key_header" && !value.authHeaderName) {
      context.addIssue({
        code: "custom",
        path: ["authHeaderName"],
        message: "API key header name is required.",
      });
    }

    if (value.authType === "basic" && !value.basicUsername) {
      context.addIssue({
        code: "custom",
        path: ["basicUsername"],
        message: "Basic auth username is required.",
      });
    }
  });

export async function createWorkflowAction(formData: FormData) {
  const parsed = workflowFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/workflows?error=${encodeURIComponent("Workflow endpoint details did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const workflowId = await createWorkflowWithHealthCheck({
    workspace,
    supabase,
    input: parsed.data,
  });

  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/");
  redirect(`/workflows/${workflowId}`);
}

const importWorkflowFormSchema = z.object({
  clientId: z.string().uuid(),
  importSource: z.enum(["url", "curl", "openapi", "postman"]),
  importedWorkflowName: z.string().trim().max(120).optional(),
  importText: z.string().trim().min(8),
});

export async function createWorkflowFromImportAction(formData: FormData) {
  const parsed = importWorkflowFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/workflows?error=${encodeURIComponent("Workflow import details did not pass validation.")}`);
  }

  let plan;

  try {
    plan = parseWorkflowImport({
      source: parsed.data.importSource,
      text: parsed.data.importText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow import could not be parsed.";
    redirect(`/workflows?error=${encodeURIComponent(message)}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const workflowId = await createWorkflowWithHealthCheck({
    workspace,
    supabase,
    input: {
      clientId: parsed.data.clientId,
      name: parsed.data.importedWorkflowName || plan.name,
      type: plan.type,
      environment: "production",
      endpointUrl: plan.endpointUrl,
      method: plan.method,
      authType: plan.authType,
      authSecret: plan.authSecret,
      authHeaderName: plan.authHeaderName,
      checkFrequencyMinutes: plan.checkFrequencyMinutes,
      expectedStatus: plan.expectedStatus,
      maxLatencyMs: plan.maxLatencyMs,
      requestBody: plan.requestBody,
    },
  });

  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/");
  redirect(`/workflows/${workflowId}`);
}

const workflowUpdateFormSchema = workflowBaseFormSchema
  .omit({
    clientId: true,
    authType: true,
    authSecret: true,
    authHeaderName: true,
    basicUsername: true,
    expectedStatus: true,
    maxLatencyMs: true,
    requestBody: true,
  })
  .extend({
    id: z.string().uuid(),
    includedInReports: z.enum(["on"]).optional(),
  });

export async function updateWorkflowAction(formData: FormData) {
  const parsed = workflowUpdateFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/workflows?error=${encodeURIComponent("Workflow update did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  let endpointUrl: string;

  try {
    endpointUrl = assertSafeWorkflowEndpoint(parsed.data.endpointUrl, {
      allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow endpoint did not pass safety validation.";
    redirect(`/workflows/${parsed.data.id}?error=${encodeURIComponent(message)}`);
  }

  const { error } = await supabase
    .from("workflows")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      environment: parsed.data.environment,
      endpoint_url: endpointUrl,
      method: parsed.data.method,
      check_frequency_minutes: parsed.data.checkFrequencyMinutes,
      included_in_reports: parsed.data.includedInReports === "on",
    })
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id);

  if (error) {
    redirect(`/workflows/${parsed.data.id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${parsed.data.id}`);
  revalidatePath("/");
  redirect(`/workflows/${parsed.data.id}`);
}

type WorkflowCreateInput = {
  clientId: string;
  name: string;
  type: Workflow["type"];
  environment: Workflow["environment"];
  endpointUrl: string;
  method: Workflow["method"];
  authType: Workflow["authType"];
  authSecret?: string;
  authHeaderName?: string;
  basicUsername?: string;
  checkFrequencyMinutes: number;
  expectedStatus: number;
  maxLatencyMs: number;
  requestBody?: string;
};

async function createWorkflowWithHealthCheck({
  workspace,
  supabase,
  input,
}: {
  workspace: WorkspaceContext;
  supabase: Awaited<ReturnType<typeof createClient>>;
  input: WorkflowCreateInput;
}) {
  const { count, error: countError } = await supabase
    .from("workflows")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", workspace.agency.id);

  if (countError) {
    redirect(`/workflows?error=${encodeURIComponent(countError.message)}`);
  }

  const limitDecision = canCreateWorkflow({
    plan: workspace.agency.plan,
    billingStatus: workspace.agency.billingStatus,
    workflows: count ?? 0,
  });

  if (!limitDecision.allowed) {
    redirect(`/workflows?error=${encodeURIComponent(limitDecision.upgradeMessage ?? "Upgrade required.")}`);
  }

  let endpointUrl: string;

  try {
    endpointUrl = assertSafeWorkflowEndpoint(input.endpointUrl, {
      allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow endpoint did not pass safety validation.";
    redirect(`/workflows?error=${encodeURIComponent(message)}`);
  }

  const authConfig = buildAuthConfig(input);
  let encryptedAuthConfig = null;

  try {
    encryptedAuthConfig = authConfig ? encryptJsonPayload(authConfig) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow auth config could not be encrypted.";
    redirect(`/workflows?error=${encodeURIComponent(message)}`);
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .insert({
      agency_id: workspace.agency.id,
      client_id: input.clientId,
      name: input.name,
      type: input.type,
      environment: input.environment,
      endpoint_url: endpointUrl,
      method: input.method,
      auth_type: input.authType,
      encrypted_auth_config: encryptedAuthConfig,
      check_frequency_minutes: input.checkFrequencyMinutes,
      status: "unknown",
      included_in_reports: true,
    })
    .select("id")
    .single();

  if (workflowError || !workflow) {
    redirect(`/workflows?error=${encodeURIComponent(workflowError?.message ?? "Workflow could not be created.")}`);
  }

  const checkConfig = checkConfigSchema.parse({
    timeoutMs: Math.max(input.maxLatencyMs + 1000, 3000),
    requestBody: input.requestBody,
    assertions: [
      { type: "status_code", expected: input.expectedStatus },
      { type: "latency_under", maxMs: input.maxLatencyMs },
    ],
  });

  const { error: checkError } = await supabase.from("checks").insert({
    agency_id: workspace.agency.id,
    workflow_id: workflow.id,
    name: "Endpoint health check",
    type: "health",
    config_json: checkConfig,
    schedule: `Every ${input.checkFrequencyMinutes} minutes`,
    enabled: true,
  });

  if (checkError) {
    redirect(`/workflows?error=${encodeURIComponent(checkError.message)}`);
  }

  return workflow.id as string;
}

function buildAuthConfig(input: WorkflowCreateInput): WorkflowAuthConfig | null {
  if (input.authType === "none") {
    return null;
  }

  if (input.authType === "bearer") {
    if (!input.authSecret) {
      throw new Error("Bearer auth requires a token.");
    }

    return { type: "bearer", token: input.authSecret };
  }

  if (input.authType === "api_key_header") {
    if (!input.authHeaderName || !input.authSecret) {
      throw new Error("API key auth requires a header name and secret.");
    }

    return {
      type: "api_key_header",
      headerName: input.authHeaderName,
      value: input.authSecret,
    };
  }

  if (!input.basicUsername || !input.authSecret) {
    throw new Error("Basic auth requires a username and password.");
  }

  return {
    type: "basic",
    username: input.basicUsername,
    password: input.authSecret,
  };
}
