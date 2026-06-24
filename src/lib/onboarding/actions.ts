"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAuditEvent, type AuditAction, type AuditTargetType } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import { canCreateClient, canCreateWorkflow } from "@/lib/billing/limits";
import { buildHealthCheckConfig } from "@/lib/checks/config";
import { executeCheckRun } from "@/lib/checks/execution";
import { buildManualCheckRunNotice } from "@/lib/checks/lifecycle";
import { assertManualCheckRunRateLimit } from "@/lib/checks/rate-limits";
import {
  checkFrequencyMinutesSchema,
  expectedStatusSchema,
  maxLatencyMsSchema,
  timeoutMsSchema,
} from "@/lib/checks/validation";
import { getReportSourceData } from "@/lib/data/operational-data";
import { sanitizeUserText } from "@/lib/domain/input-sanitization";
import type { Workflow } from "@/lib/domain/types";
import { parseOptionalSlug } from "@/lib/domain/slug";
import { buildReportDraft } from "@/lib/reports/aggregation";
import { saveReportDraft } from "@/lib/reports/service";
import { formatActionError } from "@/lib/server-actions/feedback";
import {
  assertSafeWorkflowEndpoint,
  shouldAllowPrivateWorkflowEndpoints,
} from "@/lib/security/endpoint-url";
import { encryptJsonPayload } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchOpenApiImportPlan } from "@/lib/workflows/import-fetch";
import { buildWorkflowAuthConfig } from "@/lib/workflows/lifecycle";
import {
  buildWorkflowImportSnapshot,
  parseWorkflowImport,
  type WorkflowImportPlan,
} from "@/lib/workflows/onboarding";

export type ActivationClientActionState = ActivationActionState<{
  clientId: string;
  clientName: string;
}>;

export type ActivationWorkflowActionState = ActivationActionState<{
  workflowId: string;
  workflowName: string;
  checkId: string;
  checkEnabled?: boolean;
}>;

export type ActivationRunActionState = ActivationActionState<{
  workflowId: string;
  checkRunId?: string;
  runStatus?: string;
}>;

export type ActivationReportActionState = ActivationActionState<{
  reportId: string;
  clientId: string;
}>;

type ActivationActionState<TPayload extends Record<string, unknown>> =
  | ({ status: "success"; message: string } & TPayload)
  | { status: "error"; message: string }
  | null;

const sanitizedText = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === "string" ? sanitizeUserText(value) : value),
    schema,
  );

const activationClientSchema = z.object({
  name: sanitizedText(z.string().min(2).max(100)),
  industry: sanitizedText(z.string().min(2).max(80)),
  reportRecipientEmail: z.string().trim().email(),
  notes: sanitizedText(z.string().max(1000)).optional(),
});

const activationWorkflowSchema = z.object({
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
  checkFrequencyMinutes: checkFrequencyMinutesSchema,
  expectedStatus: expectedStatusSchema.default(200),
  maxLatencyMs: maxLatencyMsSchema.default(5000),
  timeoutMs: timeoutMsSchema.default(10000),
  requestBody: z.string().trim().optional(),
  responseContains: z.string().trim().max(200).optional(),
  jsonFieldPath: z.string().trim().max(120).optional(),
  fieldNotEmptyPath: z.string().trim().max(120).optional(),
  requireValidJson: z.enum(["on"]).optional(),
}).superRefine((value, context) => {
  if (value.authType === "none") {
    return;
  }

  if (!value.authSecret) {
    context.addIssue({
      code: "custom",
      path: ["authSecret"],
      message: "Enter the auth secret for this workflow.",
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

const activationWorkflowImportSchema = z.object({
  clientId: z.string().uuid(),
  importSource: z.enum(["url", "curl", "openapi", "postman", "n8n_json", "make_blueprint", "zapier_json"]),
  workflowType: activationWorkflowSchema.shape.type.optional(),
  importedWorkflowName: z.string().trim().max(120).optional(),
  importText: z.string().trim().min(8),
  rawImportText: z.string().trim().optional(),
});

const activationRunSchema = z.object({
  checkId: z.string().uuid(),
});

const activationReportSchema = z.object({
  clientId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function createActivationClientAction(
  _previousState: ActivationClientActionState,
  formData: FormData,
): Promise<ActivationClientActionState> {
  const parsed = activationClientSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return errorState("Add a client name, industry, and valid report email before saving.");
  }

  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", workspace.agency.id)
      .is("archived_at", null);

    if (countError) {
      return errorState(formatActionError(countError, "Client limits could not be checked. Try again or contact support."));
    }

    const limitDecision = canCreateClient({
      plan: workspace.agency.plan,
      billingStatus: workspace.agency.billingStatus,
      activeClients: count ?? 0,
    });

    if (!limitDecision.allowed) {
      return errorState(limitDecision.upgradeMessage ?? "Upgrade required.");
    }

    const parsedSlug = parseOptionalSlug({
      value: undefined,
      source: parsed.data.name,
      fallback: "client",
    });

    if (!parsedSlug.success) {
      return errorState(parsedSlug.message);
    }

    const { data: client, error } = await createAdminClient()
      .from("clients")
      .insert({
        agency_id: workspace.agency.id,
        name: parsed.data.name,
        slug: parsedSlug.slug,
        industry: parsed.data.industry,
        report_recipient_email: parsed.data.reportRecipientEmail,
        notes: parsed.data.notes ?? "",
      })
      .select("id, name")
      .single();

    if (error || !client) {
      return errorState(formatActionError(error, "Client could not be added. Check the details and try again."));
    }

    revalidateActivationPaths();

    return {
      status: "success",
      message: "Client created. Next, connect the first workflow endpoint.",
      clientId: client.id as string,
      clientName: client.name as string,
    };
  } catch (error) {
    return errorState(formatActionError(error, "Client could not be added. Check the details and try again."));
  }
}

export async function createActivationWorkflowAction(
  _previousState: ActivationWorkflowActionState,
  formData: FormData,
): Promise<ActivationWorkflowActionState> {
  const parsed = activationWorkflowSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return errorState("Check the workflow name, endpoint URL, auth settings, and check thresholds before saving.");
  }

  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", workspace.agency.id)
      .is("archived_at", null);

    if (countError) {
      return errorState(formatActionError(countError, "Workflow limits could not be checked. Try again or contact support."));
    }

    const limitDecision = canCreateWorkflow({
      plan: workspace.agency.plan,
      billingStatus: workspace.agency.billingStatus,
      workflows: count ?? 0,
    });

    if (!limitDecision.allowed) {
      return errorState(limitDecision.upgradeMessage ?? "Upgrade required.");
    }

    const clientExists = await loadActivationClient({
      supabase,
      agencyId: workspace.agency.id,
      clientId: parsed.data.clientId,
    });

    if (!clientExists) {
      return errorState("Client was not found or is not accessible.");
    }

    let endpointUrl: string;
    try {
      endpointUrl = assertSafeWorkflowEndpoint(parsed.data.endpointUrl, {
        allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
      });
    } catch (error) {
      return errorState(formatActionError(error, "Workflow endpoint could not be used. Use a public endpoint and try again."));
    }

    const encryptedAuthConfig = buildActivationEncryptedAuthConfig({
      authType: parsed.data.authType,
      authSecret: parsed.data.authSecret,
      authHeaderName: parsed.data.authHeaderName,
      basicUsername: parsed.data.basicUsername,
    });
    const { data: workflow, error: workflowError } = await createAdminClient()
      .from("workflows")
      .insert({
        agency_id: workspace.agency.id,
        client_id: parsed.data.clientId,
        name: parsed.data.name,
        type: parsed.data.type,
        environment: parsed.data.environment,
        endpoint_url: endpointUrl,
        method: parsed.data.method,
        auth_type: parsed.data.authType,
        encrypted_auth_config: encryptedAuthConfig,
        check_frequency_minutes: parsed.data.checkFrequencyMinutes,
        status: "unknown",
        included_in_reports: true,
      })
      .select("id, name")
      .single();

    if (workflowError || !workflow) {
      return errorState(formatActionError(workflowError, "Workflow could not be added. Review the endpoint settings and try again."));
    }

    const checkConfig = buildHealthCheckConfig({
      expectedStatus: parsed.data.expectedStatus,
      maxLatencyMs: parsed.data.maxLatencyMs,
      timeoutMs: parsed.data.timeoutMs,
      requestBody: parsed.data.requestBody,
      responseContains: parsed.data.responseContains,
      jsonFieldPath: parsed.data.jsonFieldPath,
      fieldNotEmptyPath: parsed.data.fieldNotEmptyPath,
      requireValidJson: parsed.data.requireValidJson === "on",
    });
    const { data: check, error: checkError } = await supabase
      .from("checks")
      .insert({
        agency_id: workspace.agency.id,
        workflow_id: workflow.id,
        name: "Endpoint health check",
        type: "health",
        config_json: checkConfig,
        schedule: `Every ${parsed.data.checkFrequencyMinutes} minutes`,
        enabled: true,
      })
      .select("id")
      .single();

    if (checkError || !check) {
      return errorState(formatActionError(checkError, "Health check could not be added. Review the check settings and try again."));
    }

    await recordActivationAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "workflow.created",
      targetType: "workflow",
      targetId: workflow.id as string,
      metadata: {
        source: "activation_wizard",
        workflowType: parsed.data.type,
        method: parsed.data.method,
        environment: parsed.data.environment,
      },
    });

    revalidateActivationPaths();
    revalidatePath(`/workflows/${workflow.id}`);

    return {
      status: "success",
      message: "Workflow and first health check created. Run it once to store proof.",
      workflowId: workflow.id as string,
      workflowName: workflow.name as string,
      checkId: check.id as string,
      checkEnabled: true,
    };
  } catch (error) {
    return errorState(formatActionError(error, "Workflow could not be added. Review the endpoint settings and try again."));
  }
}

export async function createActivationWorkflowImportAction(
  _previousState: ActivationWorkflowActionState,
  formData: FormData,
): Promise<ActivationWorkflowActionState> {
  const parsed = activationWorkflowImportSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return errorState("Choose a client and paste a supported n8n, Make, Zapier, cURL, OpenAPI, Postman, or URL import.");
  }

  const importText = parsed.data.rawImportText || parsed.data.importText;
  let plan: WorkflowImportPlan;

  try {
    plan = parsed.data.importSource === "openapi" && /^https?:\/\//i.test(importText)
      ? await fetchOpenApiImportPlan({ url: importText })
      : parseWorkflowImport({
          source: parsed.data.importSource,
          text: importText,
        });
  } catch (error) {
    return errorState(formatActionError(error, "Workflow import could not be read. Check the source format and try again."));
  }

  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", workspace.agency.id)
      .is("archived_at", null);

    if (countError) {
      return errorState(formatActionError(countError, "Workflow limits could not be checked. Try again or contact support."));
    }

    const limitDecision = canCreateWorkflow({
      plan: workspace.agency.plan,
      billingStatus: workspace.agency.billingStatus,
      workflows: count ?? 0,
    });

    if (!limitDecision.allowed) {
      return errorState(limitDecision.upgradeMessage ?? "Upgrade required.");
    }

    const clientExists = await loadActivationClient({
      supabase,
      agencyId: workspace.agency.id,
      clientId: parsed.data.clientId,
    });

    if (!clientExists) {
      return errorState("Client was not found or is not accessible.");
    }

    let endpointUrl: string;
    try {
      endpointUrl = assertSafeWorkflowEndpoint(plan.endpointUrl, {
        allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
      });
    } catch (error) {
      return errorState(formatActionError(error, "Workflow endpoint could not be used. Use a public endpoint and try again."));
    }

    const { data: workflow, error: workflowError } = await createAdminClient()
      .from("workflows")
      .insert({
        agency_id: workspace.agency.id,
        client_id: parsed.data.clientId,
        name: parsed.data.importedWorkflowName || plan.name,
        type: parsed.data.workflowType ?? plan.type,
        environment: "production",
        endpoint_url: endpointUrl,
        method: plan.method,
        auth_type: plan.authType,
        encrypted_auth_config: null,
        check_frequency_minutes: plan.checkFrequencyMinutes,
        status: "unknown",
        included_in_reports: true,
      })
      .select("id, name")
      .single();

    if (workflowError || !workflow) {
      return errorState(formatActionError(workflowError, "Workflow could not be added. Review the import and try again."));
    }

    const checkConfig = buildHealthCheckConfig({
      expectedStatus: plan.expectedStatus,
      maxLatencyMs: plan.maxLatencyMs,
      timeoutMs: Math.max(plan.maxLatencyMs + 1000, 3000),
      requestBody: plan.requestBody,
    });
    const { data: check, error: checkError } = await supabase
      .from("checks")
      .insert({
        agency_id: workspace.agency.id,
        workflow_id: workflow.id,
        name: plan.checkEnabled ? "Endpoint health check" : "Heartbeat setup pending",
        type: "health",
        config_json: checkConfig,
        schedule: `Every ${plan.checkFrequencyMinutes} minutes`,
        enabled: plan.checkEnabled,
      })
      .select("id")
      .single();

    if (checkError || !check) {
      return errorState(formatActionError(checkError, "Health check could not be added. Review the import and try again."));
    }

    await recordActivationWorkflowImportContext({
      agencyId: workspace.agency.id,
      workflowId: workflow.id as string,
      importText,
      plan,
    });
    await recordActivationAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "workflow.created",
      targetType: "workflow",
      targetId: workflow.id as string,
      metadata: {
        source: "activation_import",
        importSource: plan.sourceType,
        workflowType: parsed.data.workflowType ?? plan.type,
        method: plan.method,
        triggerType: plan.maintenanceMap.triggerType,
        requiresManualEndpoint: plan.maintenanceMap.requiresManualEndpoint,
      },
    });

    revalidateActivationPaths();
    revalidatePath(`/workflows/${workflow.id}`);

    return {
      status: "success",
      message: plan.checkEnabled
        ? "Workflow imported and first health check created. Run it once to store proof."
        : "Workflow imported. Add the production webhook or heartbeat before running checks.",
      workflowId: workflow.id as string,
      workflowName: workflow.name as string,
      checkId: check.id as string,
      checkEnabled: plan.checkEnabled,
    };
  } catch (error) {
    return errorState(formatActionError(error, "Workflow could not be imported. Review the import and try again."));
  }
}

export async function runActivationCheckAction(
  _previousState: ActivationRunActionState,
  formData: FormData,
): Promise<ActivationRunActionState> {
  const parsed = activationRunSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return errorState("Check could not be found. Refresh the page and try again.");
  }

  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();

    await assertManualCheckRunRateLimit({
      agencyId: workspace.agency.id,
      userId: workspace.user.id,
    });

    const result = await executeCheckRun({
      supabase,
      agencyId: workspace.agency.id,
      checkId: parsed.data.checkId,
      trigger: "manual",
    });

    if (!result.workflowId) {
      return errorState("Check run finished, but the workflow could not be loaded. Refresh the page and try again.");
    }

    await recordActivationAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "check.run",
      targetType: "check",
      targetId: parsed.data.checkId,
      metadata: {
        trigger: "manual",
        source: "activation_wizard",
        checkRunId: result.status === "completed" ? result.checkRunId : null,
        runStatus: result.status === "completed" ? result.runStatus : result.status,
      },
    });

    revalidateActivationPaths();
    revalidatePath(`/workflows/${result.workflowId}`);
    revalidatePath("/issues");

    return {
      status: "success",
      message: result.status === "completed"
        ? buildManualCheckRunNotice(result.runStatus)
        : "Check was already recorded for this scheduled window.",
      workflowId: result.workflowId,
      checkRunId: result.status === "completed" ? result.checkRunId : undefined,
      runStatus: result.status === "completed" ? result.runStatus : result.status,
    };
  } catch (error) {
    return errorState(formatActionError(error, "Check run could not start. Try again in a few minutes."));
  }
}

export async function generateActivationReportAction(
  _previousState: ActivationReportActionState,
  formData: FormData,
): Promise<ActivationReportActionState> {
  const parsed = activationReportSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return errorState("Choose a client and month before generating a report.");
  }

  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();
    const period = getReportPeriod(parsed.data.period);
    const data = await getReportSourceData({
      agency: workspace.agency,
      clientId: parsed.data.clientId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      supabaseOverride: supabase,
    });
    const draft = buildReportDraft({
      data,
      clientId: parsed.data.clientId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
    const reportId = await saveReportDraft({
      supabase,
      agencyId: workspace.agency.id,
      draft,
    });

    await recordActivationAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "report.generated",
      targetType: "report",
      targetId: reportId,
      metadata: {
        clientId: parsed.data.clientId,
        period: parsed.data.period,
        source: "activation_wizard",
      },
    });

    revalidateActivationPaths();
    revalidatePath(`/reports/${reportId}`);

    return {
      status: "success",
      message: "Report generated from the stored workflow and check data.",
      reportId,
      clientId: parsed.data.clientId,
    };
  } catch (error) {
    return errorState(formatActionError(error, "Report could not be generated. Check the client and period, then try again."));
  }
}

async function loadActivationClient({
  supabase,
  agencyId,
  clientId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  agencyId: string;
  clientId: string;
}) {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("id", clientId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

function buildActivationEncryptedAuthConfig(input: {
  authType: Workflow["authType"];
  authSecret?: string;
  authHeaderName?: string;
  basicUsername?: string;
}) {
  if (input.authType === "none") {
    return null;
  }

  return encryptJsonPayload(buildWorkflowAuthConfig(input));
}

function getReportPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const periodStart = `${period}-01`;
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  return { periodStart, periodEnd };
}

function errorState(message: string): { status: "error"; message: string } {
  return {
    status: "error",
    message,
  };
}

function revalidateActivationPaths() {
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/reports");
}

async function recordActivationWorkflowImportContext({
  agencyId,
  workflowId,
  importText,
  plan,
}: {
  agencyId: string;
  workflowId: string;
  importText: string;
  plan: WorkflowImportPlan;
}) {
  const { error } = await createAdminClient()
    .from("workflow_imports")
    .insert({
      agency_id: agencyId,
      workflow_id: workflowId,
      source_type: plan.sourceType,
      source_name: plan.maintenanceMap.sourceName,
      source_hash: createHash("sha256").update(importText).digest("hex"),
      normalized_json: buildWorkflowImportSnapshot(plan),
      warnings: plan.maintenanceMap.warnings,
    });

  if (error) {
    throw new Error(`Workflow import context could not be saved: ${error.message}`);
  }
}

async function recordActivationAuditEvent(input: {
  agencyId: string;
  actorUserId?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      ...input,
    });
  } catch {
    // Audit logging must not block the first-run activation flow.
  }
}
