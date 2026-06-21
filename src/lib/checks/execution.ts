import type { SupabaseClient } from "@supabase/supabase-js";
import { runHttpCheck, type HttpCheckResult, type WorkflowAuthConfig } from "@/lib/checks/runner";
import type { CheckRunStatus } from "@/lib/domain/types";
import { createOrUpdateIssueForCheckRun } from "@/lib/issues/operations";
import { decryptJsonPayload, type EncryptedJsonPayload } from "@/lib/security/secrets";

export type CheckRunTrigger = "manual" | "scheduled";

export type ExecuteCheckRunInput = {
  supabase: SupabaseClient;
  agencyId: string;
  checkId: string;
  trigger: CheckRunTrigger;
  scheduledFor?: string;
};

export type ExecuteCheckRunResult =
  | {
      status: "completed";
      checkRunId: string;
      workflowId: string;
      runStatus: CheckRunStatus;
    }
  | {
      status: "skipped";
      reason: "duplicate_scheduled_window";
      workflowId?: string;
    };

type ExecutionWorkflowRow = {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  endpoint_url: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  auth_type: "none" | "bearer" | "api_key_header" | "basic";
  encrypted_auth_config: EncryptedJsonPayload | null;
};

type ExecutionCheckRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  name: string;
  config_json: unknown;
  workflows: ExecutionWorkflowRow | ExecutionWorkflowRow[];
};

type SupabaseErrorLike = {
  code?: string;
} | null;

type ExistingScheduledRunRow = {
  id: string;
  workflow_id: string;
};

const scheduledCheckTimeoutMs = 8_000;

export async function executeCheckRun({
  supabase,
  agencyId,
  checkId,
  trigger,
  scheduledFor,
}: ExecuteCheckRunInput): Promise<ExecuteCheckRunResult> {
  const { check, workflow } = await loadCheckExecutionContext({ supabase, agencyId, checkId });

  if (trigger === "scheduled" && scheduledFor) {
    const existingRun = await findExistingScheduledRun({
      supabase,
      agencyId,
      checkId,
      scheduledFor,
    });

    if (existingRun) {
      return {
        status: "skipped",
        reason: "duplicate_scheduled_window",
        workflowId: existingRun.workflow_id,
      };
    }
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
    maxAttempts: trigger === "scheduled" ? 1 : undefined,
    maxTimeoutMs: trigger === "scheduled" ? scheduledCheckTimeoutMs : undefined,
  });

  const { data: runRow, error: runError } = await supabase
    .from("check_runs")
    .insert(
      buildCheckRunInsert({
        agencyId,
        clientId: workflow.client_id,
        workflowId: workflow.id,
        checkId: check.id,
        trigger,
        scheduledFor,
        result,
      }),
    )
    .select("id")
    .single();

  if (runError) {
    if (trigger === "scheduled" && isDuplicateScheduledRunError(runError)) {
      return {
        status: "skipped",
        reason: "duplicate_scheduled_window",
        workflowId: workflow.id,
      };
    }

    throw new Error(`Check run could not be saved: ${runError.message}`);
  }

  if (!runRow) {
    throw new Error("Check run could not be saved.");
  }

  await createOrUpdateIssueForCheckRun({
    supabase,
    context: {
      agencyId,
      clientId: workflow.client_id,
      workflowId: workflow.id,
      workflowName: workflow.name,
      checkId: check.id,
      checkName: check.name,
      checkRunId: runRow.id,
      status: result.status,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      errorMessage: result.errorMessage,
      assertionResults: result.assertionResults,
    },
  });

  await updateWorkflowSummary({ supabase, agencyId, workflowId: workflow.id, result });

  return {
    status: "completed",
    checkRunId: runRow.id,
    workflowId: workflow.id,
    runStatus: result.status,
  };
}

export function buildCheckRunInsert({
  agencyId,
  clientId,
  workflowId,
  checkId,
  trigger,
  scheduledFor,
  result,
}: {
  agencyId: string;
  clientId: string;
  workflowId: string;
  checkId: string;
  trigger: CheckRunTrigger;
  scheduledFor?: string;
  result: HttpCheckResult;
}) {
  return {
    agency_id: agencyId,
    client_id: clientId,
    workflow_id: workflowId,
    check_id: checkId,
    status: result.status,
    status_code: result.statusCode,
    latency_ms: result.latencyMs,
    response_summary: result.responseSummary,
    assertion_results_json: result.assertionResults,
    error_message: result.errorMessage,
    trigger,
    scheduled_for: trigger === "scheduled" ? scheduledFor ?? null : null,
    started_at: result.startedAt,
    completed_at: result.completedAt,
  };
}

export function isDuplicateScheduledRunError(error: SupabaseErrorLike): boolean {
  return error?.code === "23505";
}

async function loadCheckExecutionContext({
  supabase,
  agencyId,
  checkId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  checkId: string;
}) {
  const { data, error } = await supabase
    .from("checks")
    .select(
      "id, agency_id, workflow_id, name, config_json, workflows(id, agency_id, client_id, name, endpoint_url, method, auth_type, encrypted_auth_config)",
    )
    .eq("agency_id", agencyId)
    .eq("id", checkId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Check could not be found.");
  }

  const check = data as ExecutionCheckRow;
  const workflow = Array.isArray(check.workflows) ? check.workflows[0] : check.workflows;

  if (!workflow || workflow.agency_id !== agencyId) {
    throw new Error("Workflow could not be loaded for this check.");
  }

  return { check, workflow };
}

async function findExistingScheduledRun({
  supabase,
  agencyId,
  checkId,
  scheduledFor,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  checkId: string;
  scheduledFor: string;
}) {
  const { data, error } = await supabase
    .from("check_runs")
    .select("id, workflow_id")
    .eq("agency_id", agencyId)
    .eq("check_id", checkId)
    .eq("trigger", "scheduled")
    .eq("scheduled_for", scheduledFor)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check scheduled run window: ${error.message}`);
  }

  return data as ExistingScheduledRunRow | null;
}

async function updateWorkflowSummary({
  supabase,
  agencyId,
  workflowId,
  result,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  workflowId: string;
  result: HttpCheckResult;
}) {
  const { data: recentRuns } = await supabase
    .from("check_runs")
    .select("status, latency_ms")
    .eq("agency_id", agencyId)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(20);

  const passRate = recentRuns?.length
    ? Math.round(
        (recentRuns.filter((run) => run.status === "healthy").length / recentRuns.length) * 100,
      )
    : result.status === "healthy"
      ? 100
      : 0;

  const { error } = await supabase
    .from("workflows")
    .update({
      status: result.status,
      pass_rate: passRate,
      latency_ms: result.latencyMs,
      last_check_at: result.completedAt,
    })
    .eq("agency_id", agencyId)
    .eq("id", workflowId);

  if (error) {
    throw new Error(`Workflow summary could not be updated: ${error.message}`);
  }
}
