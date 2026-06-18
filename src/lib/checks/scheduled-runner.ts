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

type DueHealthCheckRow = {
  id: string;
  agency_id: string;
  enabled: boolean;
  workflow_id: string;
  endpoint_url: string | null;
  check_frequency_minutes: number;
  latest_completed_at: string | null;
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
  const pageLimit = Math.max(checkId ? 1 : limit, 1);
  const attemptedCheckIds = new Set<string>();
  const summary: ScheduledCheckBatchResult = {
    attempted: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
  };

  while (true) {
    const checks = await loadSchedulableChecks({
      supabase,
      now,
      limit: pageLimit,
      checkId,
      excludeCheckIds: [...attemptedCheckIds],
    });

    if (!checks.length) {
      break;
    }

    for (const check of checks) {
      attemptedCheckIds.add(check.id);
    }

    const pageResult = await runScheduledCheckBatch({
      checks,
      now,
      limit: pageLimit,
      checkId,
      executeCheckRun: ({ agencyId, checkId, scheduledFor, trigger }) =>
        executeCheckRun({ supabase, agencyId, checkId, scheduledFor, trigger }),
    });

    summary.attempted += pageResult.attempted;
    summary.completed += pageResult.completed;
    summary.skipped += pageResult.skipped;
    summary.failed += pageResult.failed;

    if (checkId || checks.length < pageLimit) {
      break;
    }
  }

  return summary;
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
  now = new Date(),
  limit = 150,
  checkId,
  excludeCheckIds = [],
}: {
  supabase: SupabaseClient;
  now?: Date;
  limit?: number;
  checkId?: string;
  excludeCheckIds?: string[];
}): Promise<SchedulableCheck[]> {
  const { data: checks, error: checksError } = await supabase
    .rpc("get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: limit,
      p_check_id: checkId ?? null,
      p_exclude_check_ids: excludeCheckIds,
    });

  if (checksError) {
    throw new Error(`Unable to load scheduled checks: ${checksError.message}`);
  }

  return ((checks ?? []) as DueHealthCheckRow[]).map((check) => ({
    id: check.id,
    agencyId: check.agency_id,
    workflowId: check.workflow_id,
    workflowEndpointUrl: check.endpoint_url,
    workflowFrequencyMinutes: check.check_frequency_minutes,
    enabled: check.enabled,
    latestCompletedAt: check.latest_completed_at,
  }));
}
