import type { AssertionResult } from "@/lib/checks/assertions";
import type { CheckRunStatus, IssueSeverity } from "@/lib/domain/types";

type IssueRunInput = {
  checkId: string;
  checkRunId: string;
  status: CheckRunStatus;
  statusCode?: number;
  latencyMs: number;
  errorMessage?: string;
  assertionResults: AssertionResult[];
  workflowName: string;
  checkName: string;
};

export type IssueDraft = {
  fingerprint: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  reportable: boolean;
};

export type RepeatIssueUpdateInput = {
  checkRunId: string;
  draft: IssueDraft;
  existing: {
    occurrenceCount?: number | null;
  };
  now: string;
};

export function buildIssueDraftFromCheckRun(input: IssueRunInput): IssueDraft | null {
  if (input.status === "healthy" || input.status === "skipped") {
    return null;
  }

  const failure = getPrimaryFailure(input);
  const workflowName = sanitizeInlineText(input.workflowName);
  const checkName = sanitizeInlineText(input.checkName);

  return {
    fingerprint: `${input.checkId}:${failure.kind}`,
    severity: failure.severity,
    title: failure.title(workflowName),
    description: failure.description(checkName),
    suggestedAction: failure.suggestedAction,
    reportable: true,
  };
}

export function buildIssueUpdateForRepeatFailure({
  checkRunId,
  draft,
  existing,
  now,
}: RepeatIssueUpdateInput) {
  return {
    check_run_id: checkRunId,
    severity: draft.severity,
    title: draft.title,
    description: draft.description,
    suggested_action: draft.suggestedAction,
    reportable: draft.reportable,
    last_seen_at: now,
    occurrence_count: (existing.occurrenceCount ?? 1) + 1,
  };
}

function getPrimaryFailure(input: IssueRunInput) {
  const failedAssertion = input.assertionResults.find((result) => !result.passed);

  if (input.errorMessage) {
    return {
      kind: `request_error:${hashMaterial(input.errorMessage)}`,
      severity: "high" as const,
      title: (workflowName: string) => `${workflowName} check could not complete`,
      description: (checkName: string) =>
        `${checkName} did not complete successfully. The request failed before all assertions could be evaluated.`,
      suggestedAction:
        "Confirm the endpoint is reachable, credentials are still valid, and retry the check after the workflow is available.",
    };
  }

  if (failedAssertion?.type === "status_code") {
    const statusCode = input.statusCode ?? "none";
    return {
      kind: `status_code:${statusCode}`,
      severity: getStatusCodeSeverity(input.statusCode),
      title: (workflowName: string) => `${workflowName} returned HTTP ${statusCode}`,
      description: (checkName: string) =>
        `${checkName} received HTTP ${statusCode} instead of the expected status code.`,
      suggestedAction:
        "Review the workflow endpoint, upstream API credentials, and recent deployment changes before rerunning the check.",
    };
  }

  if (failedAssertion?.type === "latency_under") {
    return {
      kind: "latency_under",
      severity: input.status === "failed" ? ("medium" as const) : ("low" as const),
      title: (workflowName: string) => `${workflowName} latency is above target`,
      description: (checkName: string) =>
        `${checkName} completed in ${input.latencyMs}ms, which is slower than the configured target.`,
      suggestedAction:
        "Compare the current endpoint latency against recent runs and inspect slow downstream services.",
    };
  }

  if (failedAssertion) {
    return {
      kind: `assertion:${failedAssertion.type}`,
      severity: "medium" as const,
      title: (workflowName: string) => `${workflowName} failed a QA assertion`,
      description: (checkName: string) =>
        `${checkName} failed the ${failedAssertion.type.replaceAll("_", " ")} assertion.`,
      suggestedAction:
        "Inspect the workflow output shape and recent prompt or model changes, then rerun the check.",
    };
  }

  return {
    kind: input.status,
    severity: input.status === "failed" ? ("medium" as const) : ("low" as const),
    title: (workflowName: string) => `${workflowName} check is ${input.status}`,
    description: (checkName: string) => `${checkName} completed with ${input.status} status.`,
    suggestedAction: "Review the latest check run and rerun after remediation.",
  };
}

function getStatusCodeSeverity(statusCode?: number): IssueSeverity {
  if (!statusCode || statusCode >= 500) {
    return "high";
  }

  if (statusCode >= 400) {
    return "medium";
  }

  return "low";
}

function sanitizeInlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim() || "Workflow";
}

function hashMaterial(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}
