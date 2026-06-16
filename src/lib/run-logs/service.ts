import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkConfigSchema } from "@/lib/checks/assertions";
import type { CheckRunStatus } from "@/lib/domain/types";
import { createOrUpdateIssueForCheckRun } from "@/lib/issues/operations";
import { sanitizeReportText } from "@/lib/reports/sanitize";
import { hashRunLogApiKey, verifyRunLogApiKey } from "@/lib/run-logs/api-keys";

export const runLogPayloadSchema = z.object({
  workflowId: z.string().uuid(),
  status: z.enum(["success", "healthy", "degraded", "failed", "error"]),
  latencyMs: z.coerce.number().int().min(0).max(600000).default(0),
  statusCode: z.coerce.number().int().min(100).max(599).optional(),
  model: z.string().trim().min(1).max(80).optional(),
  promptVersion: z.string().trim().min(1).max(120).optional(),
  costEstimate: z.coerce.number().min(0).max(100000).optional(),
  outputSchemaPassed: z.boolean().optional(),
  errorType: z.string().trim().min(1).max(120).optional(),
  errorMessage: z.string().trim().min(1).max(500).optional(),
});

export type RunLogPayload = z.infer<typeof runLogPayloadSchema>;

type RunLogWorkflow = {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
};

type WorkflowApiKeyRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  key_hash: string;
  revoked_at: string | null;
  expires_at: string | null;
};

export function parseRunLogPayload(value: unknown): RunLogPayload {
  return runLogPayloadSchema.parse(value);
}

export function buildRunLogCheckRunInsert({
  workflow,
  checkId,
  payload,
  now,
}: {
  workflow: RunLogWorkflow;
  checkId: string;
  payload: RunLogPayload;
  now: string;
}) {
  const status = mapExternalStatus(payload);
  const errorMessage = status === "failed" ? sanitizeRunLogText(payload.errorMessage ?? payload.errorType ?? "External run log reported failure.") : null;

  return {
    agency_id: workflow.agency_id,
    client_id: workflow.client_id,
    workflow_id: workflow.id,
    check_id: checkId,
    status,
    status_code: payload.statusCode ?? null,
    latency_ms: payload.latencyMs,
    response_summary: buildRunLogSummary(payload, status),
    assertion_results_json: [],
    error_message: errorMessage,
    cost_estimate: payload.costEstimate ?? null,
    model: payload.model ?? null,
    prompt_version: payload.promptVersion ?? null,
    trigger: "manual",
    started_at: now,
    completed_at: now,
  };
}

export function buildRunLogIssueContext({
  workflow,
  checkId,
  checkRunId,
  insert,
}: {
  workflow: RunLogWorkflow;
  checkId: string;
  checkRunId: string;
  payload: RunLogPayload;
  insert: ReturnType<typeof buildRunLogCheckRunInsert>;
}) {
  return {
    agencyId: workflow.agency_id,
    clientId: workflow.client_id,
    workflowId: workflow.id,
    workflowName: workflow.name,
    checkId,
    checkName: "External run log",
    checkRunId,
    status: insert.status as CheckRunStatus,
    statusCode: insert.status_code ?? undefined,
    latencyMs: insert.latency_ms,
    errorMessage: insert.error_message ?? undefined,
    assertionResults: [],
  };
}

export async function recordExternalRunLog({
  supabase,
  apiKey,
  payload,
}: {
  supabase: SupabaseClient;
  apiKey: string;
  payload: RunLogPayload;
}) {
  const keyRow = await loadWorkflowApiKey({ supabase, apiKey });

  if (keyRow.workflow_id !== payload.workflowId) {
    throw new RunLogAuthError("Run log API key does not belong to this workflow.");
  }

  const workflow = await loadWorkflow({ supabase, agencyId: keyRow.agency_id, workflowId: keyRow.workflow_id });
  const checkId = await ensureRunLogCheck({ supabase, workflow });
  const now = new Date().toISOString();
  const insert = buildRunLogCheckRunInsert({ workflow, checkId, payload, now });
  const { data: run, error: runError } = await supabase
    .from("check_runs")
    .insert(insert)
    .select("id, status")
    .single();

  if (runError || !run) {
    throw new Error(`Run log could not be stored: ${runError?.message ?? "Unknown database error."}`);
  }

  await Promise.all([
    supabase
      .from("workflow_api_keys")
      .update({ last_used_at: now })
      .eq("agency_id", keyRow.agency_id)
      .eq("id", keyRow.id),
    supabase
      .from("workflows")
      .update({
        status: insert.status === "skipped" ? "unknown" : insert.status,
        latency_ms: insert.latency_ms,
        monthly_cost: payload.costEstimate ?? undefined,
        last_check_at: now,
      })
      .eq("agency_id", workflow.agency_id)
      .eq("id", workflow.id),
  ]);

  let issueCreated = false;

  if (insert.status === "failed" || insert.status === "degraded") {
    const issue = await createOrUpdateIssueForCheckRun({
      supabase,
      context: buildRunLogIssueContext({
        workflow,
        checkId,
        checkRunId: run.id as string,
        payload,
        insert,
      }),
    });
    issueCreated = Boolean(issue?.created);
  }

  return {
    checkRunId: run.id as string,
    status: insert.status as CheckRunStatus,
    issueCreated,
  };
}

export class RunLogAuthError extends Error {}

async function loadWorkflowApiKey({
  supabase,
  apiKey,
}: {
  supabase: SupabaseClient;
  apiKey: string;
}) {
  const { data, error } = await supabase
    .from("workflow_api_keys")
    .select("id, agency_id, workflow_id, key_hash, revoked_at, expires_at")
    .eq("key_hash", hashRunLogApiKey(apiKey))
    .maybeSingle();

  if (error || !data) {
    throw new RunLogAuthError("Run log API key was invalid.");
  }

  const row = data as WorkflowApiKeyRow;

  if (row.revoked_at) {
    throw new RunLogAuthError("Run log API key was revoked.");
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    throw new RunLogAuthError("Run log API key has expired.");
  }

  if (!verifyRunLogApiKey(apiKey, row.key_hash)) {
    throw new RunLogAuthError("Run log API key was invalid.");
  }

  return row;
}

async function loadWorkflow({
  supabase,
  agencyId,
  workflowId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  workflowId: string;
}) {
  const { data, error } = await supabase
    .from("workflows")
    .select("id, agency_id, client_id, name")
    .eq("agency_id", agencyId)
    .eq("id", workflowId)
    .is("archived_at", null)
    .single();

  if (error || !data) {
    throw new RunLogAuthError("Run log workflow was not found.");
  }

  return data as RunLogWorkflow;
}

async function ensureRunLogCheck({
  supabase,
  workflow,
}: {
  supabase: SupabaseClient;
  workflow: RunLogWorkflow;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("checks")
    .select("id")
    .eq("agency_id", workflow.agency_id)
    .eq("workflow_id", workflow.id)
    .eq("name", "External run log")
    .maybeSingle();

  if (existingError) {
    throw new Error(`Run log check could not be loaded: ${existingError.message}`);
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const config = checkConfigSchema.parse({
    timeoutMs: 10000,
    assertions: [{ type: "status_code", expected: 200 }],
  });
  const { data: inserted, error: insertError } = await supabase
    .from("checks")
    .insert({
      agency_id: workflow.agency_id,
      workflow_id: workflow.id,
      name: "External run log",
      type: "health",
      config_json: config,
      schedule: "External run log",
      enabled: true,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Run log check could not be created: ${insertError?.message ?? "Unknown database error."}`);
  }

  return inserted.id as string;
}

function mapExternalStatus(payload: RunLogPayload): CheckRunStatus {
  if (payload.status === "failed" || payload.status === "error") {
    return "failed";
  }

  if (payload.status === "degraded" || payload.outputSchemaPassed === false) {
    return "degraded";
  }

  return "healthy";
}

function buildRunLogSummary(payload: RunLogPayload, status: CheckRunStatus): string {
  if (status === "healthy") {
    return "External run log recorded successfully.";
  }

  if (payload.outputSchemaPassed === false) {
    return "External run log reported output schema drift.";
  }

  return sanitizeRunLogText(payload.errorMessage ?? payload.errorType ?? `External run log reported ${status} status.`);
}

function sanitizeRunLogText(value: string): string {
  return sanitizeReportText(value).slice(0, 500);
}
