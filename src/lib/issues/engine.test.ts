import { describe, expect, it } from "vitest";
import {
  buildIssueDraftFromCheckRun,
  buildIssueUpdateForRepeatFailure,
} from "@/lib/issues/engine";

const baseRun = {
  checkId: "check-123",
  checkRunId: "run-123",
  status: "failed" as const,
  latencyMs: 842,
  assertionResults: [],
};

describe("issue engine", () => {
  it("does not create issues for healthy or skipped check runs", () => {
    expect(
      buildIssueDraftFromCheckRun({
        ...baseRun,
        status: "healthy",
        statusCode: 200,
        workflowName: "Lead Intake",
        checkName: "Health check",
      }),
    ).toBeNull();

    expect(
      buildIssueDraftFromCheckRun({
        ...baseRun,
        status: "skipped",
        workflowName: "Lead Intake",
        checkName: "Health check",
      }),
    ).toBeNull();
  });

  it("creates a high-severity status issue with a stable fingerprint", () => {
    const issue = buildIssueDraftFromCheckRun({
      ...baseRun,
      statusCode: 500,
      workflowName: "Lead Intake",
      checkName: "Endpoint health",
      assertionResults: [
        {
          type: "status_code",
          passed: false,
          message: "Expected status 200, received 500.",
        },
      ],
    });

    expect(issue).toMatchObject({
      fingerprint: "check-123:status_code:500",
      severity: "high",
      title: "Lead Intake returned HTTP 500",
      reportable: true,
    });
    expect(issue?.description).toContain("Endpoint health");
    expect(issue?.suggestedAction).not.toContain("Bearer");
  });

  it("uses a different fingerprint when the material failure changes", () => {
    const statusIssue = buildIssueDraftFromCheckRun({
      ...baseRun,
      statusCode: 404,
      workflowName: "Lead Intake",
      checkName: "Endpoint health",
      assertionResults: [
        {
          type: "status_code",
          passed: false,
          message: "Expected status 200, received 404.",
        },
      ],
    });
    const latencyIssue = buildIssueDraftFromCheckRun({
      ...baseRun,
      statusCode: 200,
      latencyMs: 6200,
      workflowName: "Lead Intake",
      checkName: "Endpoint health",
      assertionResults: [
        {
          type: "latency_under",
          passed: false,
          message: "Expected latency under 5000ms, received 6200ms.",
        },
      ],
    });

    expect(statusIssue?.fingerprint).toBe("check-123:status_code:404");
    expect(latencyIssue?.fingerprint).toBe("check-123:latency_under");
  });

  it("increments repeat failures without resetting resolved state fields", () => {
    const now = "2026-06-13T12:00:00.000Z";
    const update = buildIssueUpdateForRepeatFailure({
      checkRunId: "run-456",
      draft: {
        fingerprint: "check-123:status_code:500",
        severity: "high",
        title: "Lead Intake returned HTTP 500",
        description: "A repeat failure occurred.",
        suggestedAction: "Check the endpoint.",
        reportable: true,
      },
      existing: {
        occurrenceCount: 2,
      },
      now,
    });

    expect(update).toEqual({
      check_run_id: "run-456",
      severity: "high",
      title: "Lead Intake returned HTTP 500",
      description: "A repeat failure occurred.",
      suggested_action: "Check the endpoint.",
      reportable: true,
      last_seen_at: now,
      occurrence_count: 3,
    });
  });
});
