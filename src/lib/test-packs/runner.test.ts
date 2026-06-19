import { describe, expect, it } from "vitest";
import {
  buildSyntheticIssueUpdateForRepeatFailure,
  buildSyntheticIssueDraft,
  buildSyntheticRunConfig,
  buildTestCaseAssertions,
  buildTestPackSummary,
  buildTestRunInsert,
  parseJsonInput,
} from "@/lib/test-packs/runner";

describe("synthetic test runner helpers", () => {
  it("builds a runnable check config from a test case", () => {
    expect(
      buildSyntheticRunConfig({
        inputJson: { leadId: "lead-123" },
        assertionsJson: [
          { type: "status_code", expected: 200 },
          { type: "field_exists", path: "result" },
        ],
      }),
    ).toEqual({
      timeoutMs: 10000,
      requestBody: JSON.stringify({ leadId: "lead-123" }),
      assertions: [
        { type: "status_code", expected: 200 },
        { type: "field_exists", path: "result" },
      ],
    });
  });

  it("defaults missing synthetic input and omits blank optional assertions", () => {
    expect(
      buildSyntheticRunConfig({
        inputJson: undefined,
        assertionsJson: buildTestCaseAssertions({
          expectedStatus: 200,
          maxLatencyMs: 1000,
          fieldExistsPath: " ",
          fieldNotEmptyPath: "",
          containsTextValue: "\n",
          matchesRegexPattern: "\t",
          requireValidJson: false,
          notContainsValue: " ",
        }),
      }),
    ).toEqual({
      timeoutMs: 10000,
      requestBody: "{}",
      assertions: [
        { type: "status_code", expected: 200 },
        { type: "latency_under", maxMs: 1000 },
      ],
    });
  });

  it("parses empty JSON form input as an empty object", () => {
    expect(parseJsonInput("")).toEqual({});
    expect(parseJsonInput('{"ok":true}')).toEqual({ ok: true });
  });

  it("builds a stable issue draft for failed synthetic runs", () => {
    expect(
      buildSyntheticIssueDraft({
        testPackId: "pack-1",
        testCaseId: "case-1",
        workflowName: "Matter Intake",
        testPackName: "Regression pack",
        testCaseName: "Missing jurisdiction guard",
        status: "failed",
        errorMessage: "Expected field jurisdiction to exist.",
      }),
    ).toMatchObject({
      fingerprint: "synthetic:pack-1:case-1:failed",
      severity: "medium",
      title: "Matter Intake synthetic test failed",
      reportable: true,
    });
  });

  it("does not create issues for passed or skipped synthetic runs", () => {
    expect(
      buildSyntheticIssueDraft({
        testPackId: "pack-1",
        testCaseId: "case-1",
        workflowName: "Matter Intake",
        testPackName: "Regression pack",
        testCaseName: "Happy path",
        status: "passed",
      }),
    ).toBeNull();
    expect(
      buildSyntheticIssueDraft({
        testPackId: "pack-1",
        testCaseId: "case-1",
        workflowName: "Matter Intake",
        testPackName: "Regression pack",
        testCaseName: "Happy path",
        status: "skipped",
      }),
    ).toBeNull();
  });

  it("sanitizes blank synthetic issue names and supplies a default suggested action", () => {
    expect(
      buildSyntheticIssueDraft({
        testPackId: "pack-1",
        testCaseId: "case-1",
        workflowName: "  ",
        testPackName: "\n",
        testCaseName: "\t",
        status: "failed",
      }),
    ).toEqual({
      fingerprint: "synthetic:pack-1:case-1:failed",
      severity: "medium",
      title: "Workflow synthetic test failed",
      description: "Workflow failed the Workflow test case.",
      suggestedAction:
        "Inspect the workflow output against the synthetic test expectations and rerun the pack after remediation.",
      reportable: true,
    });
  });

  it("builds assertions from the MVP test case form fields", () => {
    expect(
      buildTestCaseAssertions({
        expectedStatus: 201,
        maxLatencyMs: 2500,
        fieldExistsPath: "result.id",
        fieldNotEmptyPath: "result.answer",
        containsTextValue: "approved",
        matchesRegexPattern: "case-[0-9]+",
        requireValidJson: true,
        notContainsValue: "error",
      }),
    ).toEqual([
      { type: "status_code", expected: 201 },
      { type: "latency_under", maxMs: 2500 },
      { type: "valid_json" },
      { type: "field_exists", path: "result.id" },
      { type: "field_not_empty", path: "result.answer" },
      { type: "contains_text", value: "approved" },
      { type: "matches_regex", pattern: "case-[0-9]+" },
      { type: "not_contains", value: "error" },
    ]);
  });

  it("maps HTTP runner output into a tenant-scoped test run insert", () => {
    expect(
      buildTestRunInsert({
        agencyId: "agency-1",
        workflowId: "workflow-1",
        testPackId: "pack-1",
        testCaseId: "case-1",
        result: {
          status: "failed",
          statusCode: 422,
          latencyMs: 315,
          responseSummary: "{\"error\":\"missing jurisdiction\"}",
          assertionResults: [
            {
              type: "field_exists",
              passed: false,
              message: "Expected field jurisdiction to exist.",
            },
          ],
          errorMessage: "Expected field jurisdiction to exist.",
          startedAt: "2026-06-13T14:00:00.000Z",
          completedAt: "2026-06-13T14:00:01.000Z",
        },
      }),
    ).toEqual({
      agency_id: "agency-1",
      workflow_id: "workflow-1",
      test_pack_id: "pack-1",
      test_case_id: "case-1",
      status: "failed",
      status_code: 422,
      latency_ms: 315,
      response_summary: "{\"error\":\"missing jurisdiction\"}",
      assertion_results_json: [
        {
          type: "field_exists",
          passed: false,
          message: "Expected field jurisdiction to exist.",
        },
      ],
      error_message: "Expected field jurisdiction to exist.",
    });
  });

  it("uses failed assertion messages when the HTTP runner has no explicit error", () => {
    expect(
      buildTestRunInsert({
        agencyId: "agency-1",
        workflowId: "workflow-1",
        testPackId: "pack-1",
        testCaseId: "case-1",
        result: {
          status: "degraded",
          statusCode: 200,
          latencyMs: 6000,
          responseSummary: "{\"ok\":true}",
          assertionResults: [
            { type: "status_code", passed: true, message: "Expected HTTP 200." },
            { type: "latency_under", passed: false, message: "Expected latency under 5000 ms." },
          ],
          startedAt: "2026-06-13T14:00:00.000Z",
          completedAt: "2026-06-13T14:00:01.000Z",
        },
      }),
    ).toMatchObject({
      status: "failed",
      status_code: 200,
      error_message: "Expected latency under 5000 ms.",
    });
  });

  it("maps healthy and skipped HTTP results to synthetic test run statuses", () => {
    const base = {
      agencyId: "agency-1",
      workflowId: "workflow-1",
      testPackId: "pack-1",
      testCaseId: "case-1",
    };

    expect(
      buildTestRunInsert({
        ...base,
        result: {
          status: "healthy",
          statusCode: 200,
          latencyMs: 80,
          responseSummary: "ok",
          assertionResults: [],
          startedAt: "2026-06-13T14:00:00.000Z",
          completedAt: "2026-06-13T14:00:01.000Z",
        },
      }),
    ).toMatchObject({ status: "passed", error_message: null });
    expect(
      buildTestRunInsert({
        ...base,
        result: {
          status: "skipped",
          latencyMs: 0,
          responseSummary: "",
          assertionResults: [],
          startedAt: "2026-06-13T14:00:00.000Z",
          completedAt: "2026-06-13T14:00:01.000Z",
        },
      }),
    ).toMatchObject({ status: "skipped", status_code: null, error_message: null });
  });

  it("increments repeat synthetic failures using the latest test run", () => {
    const now = "2026-06-13T14:15:00.000Z";

    expect(
      buildSyntheticIssueUpdateForRepeatFailure({
        testRunId: "test-run-2",
        draft: {
          fingerprint: "synthetic:pack-1:case-1:failed",
          severity: "medium",
          title: "Matter Intake synthetic test failed",
          description: "Regression pack failed the Missing jurisdiction guard test case.",
          suggestedAction: "Expected field jurisdiction to exist.",
          reportable: true,
        },
        existing: {
          occurrenceCount: 4,
        },
        now,
      }),
    ).toEqual({
      test_run_id: "test-run-2",
      severity: "medium",
      title: "Matter Intake synthetic test failed",
      description: "Regression pack failed the Missing jurisdiction guard test case.",
      suggested_action: "Expected field jurisdiction to exist.",
      reportable: true,
      last_seen_at: now,
      occurrence_count: 5,
    });

    expect(
      buildSyntheticIssueUpdateForRepeatFailure({
        testRunId: "test-run-1",
        draft: {
          fingerprint: "synthetic:pack-1:case-1:failed",
          severity: "medium",
          title: "Matter Intake synthetic test failed",
          description: "Regression pack failed the Missing jurisdiction guard test case.",
          suggestedAction: "Expected field jurisdiction to exist.",
          reportable: true,
        },
        existing: {
          occurrenceCount: null,
        },
        now,
      }),
    ).toMatchObject({
      test_run_id: "test-run-1",
      occurrence_count: 2,
    });
  });

  it("summarizes test pack pass rate and latest run time", () => {
    expect(
      buildTestPackSummary({
        caseCount: 3,
        runs: [
          { status: "passed", createdAt: "2026-06-13T14:30:00.000Z" },
          { status: "failed", createdAt: "2026-06-13T14:25:00.000Z" },
          { status: "passed", createdAt: "2026-06-13T14:20:00.000Z" },
        ],
      }),
    ).toEqual({
      caseCount: 3,
      passRate: 67,
      lastRunAt: "2026-06-13T14:30:00.000Z",
    });
  });

  it("summarizes empty or skipped-only test packs without inflating pass rate", () => {
    expect(buildTestPackSummary({ caseCount: 2, runs: [] })).toEqual({
      caseCount: 2,
      passRate: 0,
      lastRunAt: "1970-01-01T00:00:00.000Z",
    });
    expect(
      buildTestPackSummary({
        caseCount: 2,
        runs: [
          { status: "skipped", createdAt: "2026-06-13T14:20:00.000Z" },
          { status: "skipped", createdAt: "2026-06-13T14:30:00.000Z" },
        ],
      }),
    ).toEqual({
      caseCount: 2,
      passRate: 0,
      lastRunAt: "2026-06-13T14:30:00.000Z",
    });
  });
});
