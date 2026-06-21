import type { CheckRunStatus } from "@/lib/domain/types";
import { getHealthCheckThresholdMessage } from "@/lib/checks/thresholds";

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

export function formatCheckConfigValidationError(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string {
  const messages = issues.map((issue) => {
    const field = String(issue.path[0] ?? "");

    if (field === "name") {
      return "Check name must be 2-120 characters.";
    }

    if (field === "expectedStatus") {
      return getHealthCheckThresholdMessage(field);
    }

    if (field === "maxLatencyMs") {
      return getHealthCheckThresholdMessage(field);
    }

    if (field === "timeoutMs") {
      return getHealthCheckThresholdMessage(field);
    }

    if (field === "responseContains") {
      return "Response text assertion must be 200 or fewer characters.";
    }

    if (field === "jsonFieldPath") {
      return "Required field path must be 120 or fewer characters.";
    }

    if (field === "fieldNotEmptyPath") {
      return "Required non-empty field path must be 120 or fewer characters.";
    }

    if (field === "notContainsValue") {
      return "Must-not-contain assertion must be 200 or fewer characters.";
    }

    if (field === "matchesRegexPattern") {
      return "Regex assertion must be 500 or fewer characters.";
    }

    return issue.message;
  });

  return [...new Set(messages)].join(" ");
}
