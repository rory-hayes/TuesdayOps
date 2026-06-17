import type { SupabaseClient } from "@supabase/supabase-js";
import { executeCheckRun, type ExecuteCheckRunResult } from "@/lib/checks/execution";
import {
  getScheduledWindowStart,
  selectDueChecks,
  type SchedulableCheck,
} from "@/lib/checks/scheduler";

type ExecuteScheduledCheckRun = (input: {
  agencyId: string;
  checkId: string;
  trigger: "scheduled";
  scheduledFor: string;
}) => Promise<ExecuteCheckRunResult | { status: "skipped" }>;

export type ScheduledCheckBatchResult = {
  attempted: number;
  completed: number;
  skipped: number;
  failed: number;
};

type ScheduledCheckRow = {
  id: string;
  agency_id: string;
  enabled: boolean;
  workflow_id: string;
  workflows:
    | {
        id: string;
        endpoint_url: string | null;
        check_frequency_minutes: number;
      }
    | {
        id: string;
        endpoint_url: string | null;
        check_frequency_minutes: number;
      }[];
};

type LatestRunRow = {
  check_id: string;
  completed_at: string;
};

export async function runDueScheduledChecks({
  supabase,
  now = new Date(),
  limit = 50,
  checkId,
}: {
  supabase: SupabaseClient;
  now?: Date;
  limit?: number;
  checkId?: string;
}): Promise<ScheduledCheckBatchResult> {
  const checks = await loadSchedulableChecks({
    supabase,
    limit: checkId ? 1 : Math.max(limit * 3, limit),
    checkId,
  });

  return runScheduledCheckBatch({
    checks,
    now,
    limit,
    checkId,
    executeCheckRun: ({ agencyId, checkId, scheduledFor, trigger }) =>
      executeCheckRun({ supabase, agencyId, checkId, scheduledFor, trigger }),
  });
}

export async function runScheduledCheckBatch({
  checks,
  now = new Date(),
  limit = 50,
  checkId,
  executeCheckRun,
}: {
  checks: SchedulableCheck[];
  now?: Date;
  limit?: number;
  checkId?: string;
  executeCheckRun: ExecuteScheduledCheckRun;
}): Promise<ScheduledCheckBatchResult> {
  const scheduledFor = getScheduledWindowStart(now).toISOString();
  const dueChecks = selectDueChecks(checks, now, limit, { checkId });
  const summary: ScheduledCheckBatchResult = {
    attempted: dueChecks.length,
    completed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const check of dueChecks) {
    try {
      const result = await executeCheckRun({
        agencyId: check.agencyId,
        checkId: check.id,
        trigger: "scheduled",
        scheduledFor,
      });

      if (result.status === "skipped") {
        summary.skipped += 1;
      } else {
        summary.completed += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error("Scheduled check run failed", {
        agencyId: check.agencyId,
        checkId: check.id,
        reason: formatScheduledRunError(error),
      });
    }
  }

  return summary;
}

function formatScheduledRunError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown scheduled check error.";

  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]")
    .slice(0, 400);
}

export async function loadSchedulableChecks({
  supabase,
  limit = 150,
  checkId,
}: {
  supabase: SupabaseClient;
  limit?: number;
  checkId?: string;
}): Promise<SchedulableCheck[]> {
  let query = supabase
    .from("checks")
    .select("id, agency_id, enabled, workflow_id, workflows(id, endpoint_url, check_frequency_minutes)")
    .eq("type", "health")
    .eq("enabled", true);

  if (checkId) {
    query = query.eq("id", checkId);
  }

  const { data: checks, error: checksError } = await query.limit(limit);

  if (checksError) {
    throw new Error(`Unable to load scheduled checks: ${checksError.message}`);
  }

  const checkRows = (checks ?? []) as ScheduledCheckRow[];
  const checkIds = checkRows.map((check) => check.id);
  const latestCompletedByCheck = new Map<string, string>();

  if (checkIds.length) {
    const { data: runs, error: runsError } = await supabase
      .from("check_runs")
      .select("check_id, completed_at")
      .in("check_id", checkIds)
      .order("completed_at", { ascending: false });

    if (runsError) {
      throw new Error(`Unable to load recent check runs: ${runsError.message}`);
    }

    for (const run of (runs ?? []) as LatestRunRow[]) {
      if (!latestCompletedByCheck.has(run.check_id)) {
        latestCompletedByCheck.set(run.check_id, run.completed_at);
      }
    }
  }

  return checkRows.map((check) => {
    const workflow = Array.isArray(check.workflows) ? check.workflows[0] : check.workflows;

    return {
      id: check.id,
      agencyId: check.agency_id,
      workflowId: check.workflow_id,
      workflowEndpointUrl: workflow?.endpoint_url ?? null,
      workflowFrequencyMinutes: workflow?.check_frequency_minutes ?? 60,
      enabled: check.enabled,
      latestCompletedAt: latestCompletedByCheck.get(check.id) ?? null,
    };
  });
}
