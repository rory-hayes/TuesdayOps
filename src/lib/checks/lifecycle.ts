import type { CheckRunStatus } from "@/lib/domain/types";

export function buildCheckDisableUpdate() {
  return {
    enabled: false,
  };
}

export function buildManualCheckRunNotice(status: CheckRunStatus): string {
  if (status === "healthy") {
    return "Check run passed. History was updated.";
  }

  if (status === "degraded") {
    return "Check run degraded. Review assertions and history.";
  }

  if (status === "failed") {
    return "Check run failed. Issue tracking and history were updated.";
  }

  return "Check run skipped. History was updated.";
}
