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

  it("creates high-severity request error issues without leaking raw error material", () => {
    const issue = buildIssueDraftFromCheckRun({
      ...baseRun,
      workflowName: "  Risk   Router  ",
      checkName: "Endpoint health",
      errorMessage: "Bearer secret-token failed",
      assertionResults: [
        {
          type: "status_code",
          passed: false,
          message: "Request failed.",
        },
      ],
    });

    expect(issue).toMatchObject({
      severity: "high",
      title: "Risk Router check could not complete",
    });
    expect(issue?.fingerprint).toMatch(/^check-123:request_error:/);
    expect(issue?.suggestedAction).not.toContain("secret-token");
  });

  it("maps status and assertion failure types into appropriate severity", () => {
    const mediumStatus = buildIssueDraftFromCheckRun({
      ...baseRun,
      statusCode: 404,
      workflowName: "Lead Intake",
      checkName: "Endpoint health",
      assertionResults: [{ type: "status_code", passed: false, message: "404" }],
    });
    const lowStatus = buildIssueDraftFromCheckRun({
      ...baseRun,
      statusCode: 302,
      workflowName: "Lead Intake",
      checkName: "Endpoint health",
      assertionResults: [{ type: "status_code", passed: false, message: "302" }],
    });
    const genericAssertion = buildIssueDraftFromCheckRun({
      ...baseRun,
      statusCode: 200,
      workflowName: "Lead Intake",
      checkName: "Endpoint health",
      assertionResults: [{ type: "field_exists", passed: false, message: "missing field" }],
    });

    expect(mediumStatus?.severity).toBe("medium");
    expect(lowStatus?.severity).toBe("low");
    expect(genericAssertion).toMatchObject({
      severity: "medium",
      title: "Lead Intake failed a QA assertion",
    });
  });

  it("uses degraded latency and fallback statuses when no assertion explains the run", () => {
    const degradedLatency = buildIssueDraftFromCheckRun({
      ...baseRun,
      status: "degraded",
      latencyMs: 6000,
      workflowName: "Reminder Agent",
      checkName: "Latency guard",
      assertionResults: [{ type: "latency_under", passed: false, message: "slow" }],
    });
    const fallback = buildIssueDraftFromCheckRun({
      ...baseRun,
      status: "degraded",
      workflowName: "",
      checkName: "",
      assertionResults: [],
    });

    expect(degradedLatency).toMatchObject({
      severity: "low",
      title: "Reminder Agent latency is above target",
    });
    expect(fallback).toMatchObject({
      fingerprint: "check-123:degraded",
      severity: "low",
      title: "Workflow check is degraded",
      description: "Workflow completed with degraded status.",
    });
  });
});
