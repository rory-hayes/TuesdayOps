"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import { canCreateWorkflow } from "@/lib/billing/limits";
import { buildHealthCheckConfig } from "@/lib/checks/config";
import type { Workflow } from "@/lib/domain/types";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import {
  assertSafeWorkflowEndpoint,
  shouldAllowPrivateWorkflowEndpoints,
} from "@/lib/security/endpoint-url";
import { encryptJsonPayload } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchOpenApiImportPlan } from "@/lib/workflows/import-fetch";
import {
  buildPrimaryHealthCheckMutation,
  buildWorkflowArchiveUpdate,
  buildWorkflowAuthConfig,
  buildWorkflowAuthUpdate,
  buildWorkflowSettingsUpdate,
} from "@/lib/workflows/lifecycle";
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
  timeoutMs: z.coerce.number().int().min(1000).max(60000).default(10000),
  requestBody: z.string().trim().optional(),
  responseContains: z.string().trim().max(200).optional(),
  jsonFieldPath: z.string().trim().max(120).optional(),
  fieldNotEmptyPath: z.string().trim().max(120).optional(),
  notContainsValue: z.string().trim().max(200).optional(),
  matchesRegexPattern: z.string().trim().max(500).optional(),
  requireValidJson: z.enum(["on"]).optional(),
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
  await recordWorkflowAuditEvent({
    workspace,
    action: "workflow.created",
    targetId: workflowId,
    metadata: {
      source: "manual",
      workflowType: parsed.data.type,
      method: parsed.data.method,
      environment: parsed.data.environment,
    },
  });

  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/");
  redirect(`/workflows/${workflowId}?notice=${encodeURIComponent("Workflow added. Run its first check when ready.")}`);
}

const importWorkflowFormSchema = z.object({
  clientId: z.string().uuid(),
  importSource: z.enum(["url", "curl", "openapi", "postman"]),
  workflowType: workflowBaseFormSchema.shape.type.optional(),
  importedWorkflowName: z.string().trim().max(120).optional(),
  importText: z.string().trim().min(8),
  rawImportText: z.string().trim().optional(),
});

export async function createWorkflowFromImportAction(formData: FormData) {
  const parsed = importWorkflowFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/workflows?error=${encodeURIComponent("Workflow import details did not pass validation.")}`);
  }

  let plan;
  const importText = parsed.data.rawImportText || parsed.data.importText;

  try {
    plan = parsed.data.importSource === "openapi" && /^https?:\/\//i.test(importText)
      ? await fetchOpenApiImportPlan({
          url: importText,
        })
      : parseWorkflowImport({
          source: parsed.data.importSource,
          text: importText,
        });
  } catch (error) {
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(error, "Workflow import could not be parsed."))}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const workflowId = await createWorkflowWithHealthCheck({
    workspace,
    supabase,
    input: {
      clientId: parsed.data.clientId,
      name: parsed.data.importedWorkflowName || plan.name,
      type: parsed.data.workflowType ?? plan.type,
      environment: "production",
      endpointUrl: plan.endpointUrl,
      method: plan.method,
      authType: plan.authType,
      authSecret: plan.authSecret,
      authHeaderName: plan.authHeaderName,
      checkFrequencyMinutes: plan.checkFrequencyMinutes,
    expectedStatus: plan.expectedStatus,
    maxLatencyMs: plan.maxLatencyMs,
    timeoutMs: Math.max(plan.maxLatencyMs + 1000, 3000),
    requestBody: plan.requestBody,
  },
  });
  await recordWorkflowAuditEvent({
    workspace,
    action: "workflow.created",
    targetId: workflowId,
    metadata: {
      source: "import",
      importSource: parsed.data.importSource,
      workflowType: parsed.data.workflowType ?? plan.type,
      method: plan.method,
      authType: plan.authType,
    },
  });

  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/");
  redirect(`/workflows/${workflowId}?notice=${encodeURIComponent("Workflow imported and health check created.")}`);
}

const workflowUpdateFormSchema = workflowBaseFormSchema
  .omit({
    clientId: true,
  })
  .extend({
    id: z.string().uuid(),
    includedInReports: z.enum(["on"]).optional(),
    returnTab: z.enum(["overview", "checks", "api", "endpoint", "settings"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.authType === "api_key_header" && value.authSecret && !value.authHeaderName) {
      context.addIssue({
        code: "custom",
        path: ["authHeaderName"],
        message: "API key header name is required when rotating API key auth.",
      });
    }

    if (value.authType === "basic" && value.authSecret && !value.basicUsername) {
      context.addIssue({
        code: "custom",
        path: ["basicUsername"],
        message: "Basic auth username is required when rotating basic auth.",
      });
    }
  });

const workflowIdFormSchema = z.object({
  id: z.string().uuid(),
});

export async function updateWorkflowAction(formData: FormData) {
  const parsed = workflowUpdateFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/workflows?error=${encodeURIComponent("Workflow update did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  let endpointUrl: string;
  let authUpdate: {
    auth_type: Workflow["authType"];
    encrypted_auth_config?: ReturnType<typeof encryptJsonPayload> | null;
  };

  try {
    endpointUrl = assertSafeWorkflowEndpoint(parsed.data.endpointUrl, {
      allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
    });
    const currentWorkflow = await loadWorkflowAuthState({
      supabase,
      agencyId: workspace.agency.id,
      workflowId: parsed.data.id,
    });
    authUpdate = buildWorkflowAuthUpdate({
      input: parsed.data,
      current: currentWorkflow,
      nextEndpointUrl: endpointUrl,
    });
  } catch (error) {
    redirect(buildWorkflowRedirect(parsed.data.id, {
      error: formatActionError(error, "Workflow settings did not pass validation."),
      tab: parsed.data.returnTab,
    }));
  }

  const checkConfig = buildHealthCheckConfig({
    expectedStatus: parsed.data.expectedStatus,
    maxLatencyMs: parsed.data.maxLatencyMs,
    timeoutMs: parsed.data.timeoutMs,
    requestBody: parsed.data.requestBody,
    responseContains: parsed.data.responseContains,
    jsonFieldPath: parsed.data.jsonFieldPath,
    fieldNotEmptyPath: parsed.data.fieldNotEmptyPath,
    notContainsValue: parsed.data.notContainsValue,
    matchesRegexPattern: parsed.data.matchesRegexPattern,
    requireValidJson: parsed.data.requireValidJson === "on",
  });

  const updateResult = await createAdminClient()
    .from("workflows")
    .update(buildWorkflowSettingsUpdate({
      input: {
        name: parsed.data.name,
        type: parsed.data.type,
        environment: parsed.data.environment,
        method: parsed.data.method,
        checkFrequencyMinutes: parsed.data.checkFrequencyMinutes,
        includedInReports: parsed.data.includedInReports === "on",
      },
      endpointUrl,
      authUpdate,
    }))
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Workflow was not found or is not accessible.");
    await upsertPrimaryHealthCheck({
      supabase,
      agencyId: workspace.agency.id,
      workflowId: parsed.data.id,
      frequencyMinutes: parsed.data.checkFrequencyMinutes,
      configJson: checkConfig,
    });
  } catch (error) {
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(error, "Workflow could not be saved."))}`);
  }
  await recordWorkflowAuditEvent({
    workspace,
    action: "workflow.updated",
    targetId: parsed.data.id,
    metadata: {
      workflowType: parsed.data.type,
      method: parsed.data.method,
      environment: parsed.data.environment,
      authType: parsed.data.authType,
      healthCheckAssertions: checkConfig.assertions.length,
      includedInReports: parsed.data.includedInReports === "on",
    },
  });

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${parsed.data.id}`);
  revalidatePath("/");
  redirect(buildWorkflowRedirect(parsed.data.id, {
    notice: "Workflow saved.",
    tab: parsed.data.returnTab,
  }));
}

export async function archiveWorkflowAction(formData: FormData) {
  const parsed = workflowIdFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/workflows?error=${encodeURIComponent("Workflow id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const archiveResult = await supabase
    .from("workflows")
    .update(buildWorkflowArchiveUpdate())
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(archiveResult, "Workflow was not found or is not accessible.");
  } catch (error) {
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(error, "Workflow could not be archived."))}`);
  }

  await recordWorkflowAuditEvent({
    workspace,
    action: "workflow.archived",
    targetId: parsed.data.id,
    metadata: {},
  });

  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/");
  redirect(`/workflows?notice=${encodeURIComponent("Workflow archived. Historical runs and report data were preserved.")}`);
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
  timeoutMs: number;
  requestBody?: string;
  responseContains?: string;
  jsonFieldPath?: string;
  fieldNotEmptyPath?: string;
  notContainsValue?: string;
  matchesRegexPattern?: string;
  requireValidJson?: "on";
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
    .eq("agency_id", workspace.agency.id)
    .is("archived_at", null);

  if (countError) {
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(countError, "Workflow count could not be loaded."))}`);
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
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(error, "Workflow endpoint did not pass safety validation."))}`);
  }

  const authConfig = input.authType === "none" ? null : buildWorkflowAuthConfig(input);
  let encryptedAuthConfig = null;

  try {
    encryptedAuthConfig = authConfig ? encryptJsonPayload(authConfig) : null;
  } catch (error) {
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(error, "Workflow auth config could not be encrypted."))}`);
  }

  const { data: workflow, error: workflowError } = await createAdminClient()
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
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(workflowError, "Workflow could not be created."))}`);
  }

  const checkConfig = buildHealthCheckConfig({
    expectedStatus: input.expectedStatus,
    maxLatencyMs: input.maxLatencyMs,
    timeoutMs: input.timeoutMs,
    requestBody: input.requestBody,
    responseContains: input.responseContains,
    jsonFieldPath: input.jsonFieldPath,
    fieldNotEmptyPath: input.fieldNotEmptyPath,
    notContainsValue: input.notContainsValue,
    matchesRegexPattern: input.matchesRegexPattern,
    requireValidJson: input.requireValidJson === "on",
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
    redirect(`/workflows?error=${encodeURIComponent(formatActionError(checkError, "Health check could not be created."))}`);
  }

  return workflow.id as string;
}

async function loadWorkflowAuthState({
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
    .select("id, endpoint_url, auth_type, encrypted_auth_config")
    .eq("agency_id", agencyId)
    .eq("id", workflowId)
    .maybeSingle();

  assertMutationTouchedRow(result, "Workflow was not found or is not accessible.");

  return result.data as {
    id: string;
    endpoint_url: string;
    auth_type: Workflow["authType"];
    encrypted_auth_config: ReturnType<typeof encryptJsonPayload> | null;
  };
}

async function upsertPrimaryHealthCheck({
  supabase,
  agencyId,
  workflowId,
  frequencyMinutes,
  configJson,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  agencyId: string;
  workflowId: string;
  frequencyMinutes: number;
  configJson: unknown;
}) {
  const { data: existingCheck, error: lookupError } = await supabase
    .from("checks")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("workflow_id", workflowId)
    .eq("type", "health")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Health check could not be loaded: ${lookupError.message}`);
  }

  const mutation = buildPrimaryHealthCheckMutation({
    existingCheckId: (existingCheck as { id: string } | null)?.id,
    agencyId,
    workflowId,
    frequencyMinutes,
    configJson,
  });

  if (mutation.mode === "update") {
    const updateResult = await supabase
      .from("checks")
      .update(mutation.values)
      .eq("agency_id", agencyId)
      .eq("id", mutation.checkId)
      .select("id")
      .maybeSingle();

    assertMutationTouchedRow(updateResult, "Health check was not found or is not accessible.");
    return;
  }

  const { error } = await supabase.from("checks").insert(mutation.values);

  if (error) {
    throw new Error(`Health check could not be created: ${error.message}`);
  }
}

async function recordWorkflowAuditEvent({
  workspace,
  action,
  targetId,
  metadata,
}: {
  workspace: WorkspaceContext;
  action: "workflow.created" | "workflow.updated" | "workflow.archived";
  targetId: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action,
      targetType: "workflow",
      targetId,
      metadata,
    });
  } catch {
    // Audit logging must not block workflow onboarding or updates.
  }
}

function buildWorkflowRedirect(
  workflowId: string,
  values: {
    error?: string;
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

  if (values.error) {
    params.set("error", values.error);
  }

  return `/workflows/${workflowId}?${params.toString()}`;
}
