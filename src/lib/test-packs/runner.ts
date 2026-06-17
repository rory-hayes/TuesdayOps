import type { CheckAssertion, CheckConfig } from "@/lib/checks/assertions";
import { checkConfigSchema } from "@/lib/checks/assertions";
import type { HttpCheckResult } from "@/lib/checks/runner";
import type { IssueDraft } from "@/lib/issues/engine";

export type SyntheticRunConfigInput = {
  inputJson: unknown;
  assertionsJson: unknown;
};

export type SyntheticIssueDraftInput = {
  testPackId: string;
  testCaseId: string;
  workflowName: string;
  testPackName: string;
  testCaseName: string;
  status: "passed" | "failed" | "skipped";
  errorMessage?: string;
};

export type TestCaseAssertionInput = {
  expectedStatus: number;
  maxLatencyMs: number;
  fieldExistsPath?: string;
  fieldNotEmptyPath?: string;
  containsTextValue?: string;
  matchesRegexPattern?: string;
  requireValidJson?: boolean;
  notContainsValue?: string;
};

export type TestRunStatus = "passed" | "failed" | "skipped";

export type TestPackSummaryRun = {
  status: TestRunStatus;
  createdAt: string;
};

export function buildSyntheticRunConfig({
  inputJson,
  assertionsJson,
}: SyntheticRunConfigInput): CheckConfig {
  return checkConfigSchema.parse({
    timeoutMs: 10000,
    requestBody: JSON.stringify(inputJson ?? {}),
    assertions: assertionsJson,
  });
}

export function buildTestCaseAssertions({
  expectedStatus,
  maxLatencyMs,
  fieldExistsPath,
  fieldNotEmptyPath,
  containsTextValue,
  matchesRegexPattern,
  requireValidJson,
  notContainsValue,
}: TestCaseAssertionInput): CheckAssertion[] {
  const assertions: CheckAssertion[] = [
    { type: "status_code", expected: expectedStatus },
    { type: "latency_under", maxMs: maxLatencyMs },
  ];
  const normalizedFieldPath = fieldExistsPath?.trim();
  const normalizedNotEmptyPath = fieldNotEmptyPath?.trim();
  const normalizedRequiredText = containsTextValue?.trim();
  const normalizedRegexPattern = matchesRegexPattern?.trim();
  const normalizedForbiddenValue = notContainsValue?.trim();

  if (requireValidJson) {
    assertions.push({ type: "valid_json" });
  }

  if (normalizedFieldPath) {
    assertions.push({ type: "field_exists", path: normalizedFieldPath });
  }

  if (normalizedNotEmptyPath) {
    assertions.push({ type: "field_not_empty", path: normalizedNotEmptyPath });
  }

  if (normalizedRequiredText) {
    assertions.push({ type: "contains_text", value: normalizedRequiredText });
  }

  if (normalizedRegexPattern) {
    assertions.push({ type: "matches_regex", pattern: normalizedRegexPattern });
  }

  if (normalizedForbiddenValue) {
    assertions.push({ type: "not_contains", value: normalizedForbiddenValue });
  }

  return assertions;
}

export function buildTestRunInsert({
  agencyId,
  workflowId,
  testPackId,
  testCaseId,
  result,
}: {
  agencyId: string;
  workflowId: string;
  testPackId: string;
  testCaseId: string;
  result: HttpCheckResult;
}) {
  return {
    agency_id: agencyId,
    workflow_id: workflowId,
    test_pack_id: testPackId,
    test_case_id: testCaseId,
    status: mapHttpStatusToTestRunStatus(result.status),
    status_code: result.statusCode ?? null,
    latency_ms: result.latencyMs,
    response_summary: result.responseSummary,
    assertion_results_json: result.assertionResults,
    error_message: result.errorMessage ?? getFirstFailedAssertionMessage(result),
  };
}

export function parseJsonInput(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed) {
    return {};
  }

  return JSON.parse(trimmed);
}

export function buildSyntheticIssueDraft(input: SyntheticIssueDraftInput): IssueDraft | null {
  if (input.status !== "failed") {
    return null;
  }

  const workflowName = sanitizeInlineText(input.workflowName);
  const testPackName = sanitizeInlineText(input.testPackName);
  const testCaseName = sanitizeInlineText(input.testCaseName);

  return {
    fingerprint: `synthetic:${input.testPackId}:${input.testCaseId}:failed`,
    severity: "medium",
    title: `${workflowName} synthetic test failed`,
    description: `${testPackName} failed the ${testCaseName} test case.`,
    suggestedAction:
      input.errorMessage ??
      "Inspect the workflow output against the synthetic test expectations and rerun the pack after remediation.",
    reportable: true,
  };
}

export function buildSyntheticIssueUpdateForRepeatFailure({
  testRunId,
  draft,
  existing,
  now,
}: {
  testRunId: string;
  draft: IssueDraft;
  existing: {
    occurrenceCount?: number | null;
  };
  now: string;
}) {
  return {
    test_run_id: testRunId,
    severity: draft.severity,
    title: draft.title,
    description: draft.description,
    suggested_action: draft.suggestedAction,
    reportable: draft.reportable,
    last_seen_at: now,
    occurrence_count: (existing.occurrenceCount ?? 1) + 1,
  };
}

export function buildTestPackSummary({
  caseCount,
  runs,
}: {
  caseCount: number;
  runs: TestPackSummaryRun[];
}) {
  const completedRuns = runs.filter((run) => run.status !== "skipped");
  const passedRuns = completedRuns.filter((run) => run.status === "passed").length;
  const sortedRuns = [...runs].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return {
    caseCount,
    passRate: completedRuns.length ? Math.round((passedRuns / completedRuns.length) * 100) : 0,
    lastRunAt: sortedRuns[0]?.createdAt ?? new Date(0).toISOString(),
  };
}

function sanitizeInlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim() || "Workflow";
}

function mapHttpStatusToTestRunStatus(status: HttpCheckResult["status"]): TestRunStatus {
  if (status === "healthy") {
    return "passed";
  }

  if (status === "skipped") {
    return "skipped";
  }

  return "failed";
}

function getFirstFailedAssertionMessage(result: HttpCheckResult): string | null {
  return result.assertionResults.find((assertion) => !assertion.passed)?.message ?? null;
}
