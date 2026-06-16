import { describe, expect, it } from "vitest";
import {
  buildRunLogCheckRunInsert,
  buildRunLogIssueContext,
  parseRunLogPayload,
} from "./service";

const workflow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  agency_id: "550e8400-e29b-41d4-a716-446655440001",
  client_id: "550e8400-e29b-41d4-a716-446655440002",
  name: "Lead Intake",
};

describe("run-log service", () => {
  it("maps successful external logs into healthy check runs", () => {
    const payload = parseRunLogPayload({
      workflowId: "550e8400-e29b-41d4-a716-446655440000",
      status: "success",
      latencyMs: 312,
      statusCode: 200,
      model: "gpt-4.1-mini",
      promptVersion: "v2",
      costEstimate: 0.014,
    });

    expect(buildRunLogCheckRunInsert({
      workflow,
      checkId: "check-1",
      payload,
      now: "2026-06-16T12:00:00.000Z",
    })).toEqual({
      agency_id: "550e8400-e29b-41d4-a716-446655440001",
      client_id: "550e8400-e29b-41d4-a716-446655440002",
      workflow_id: "550e8400-e29b-41d4-a716-446655440000",
      check_id: "check-1",
      status: "healthy",
      status_code: 200,
      latency_ms: 312,
      response_summary: "External run log recorded successfully.",
      assertion_results_json: [],
      error_message: null,
      cost_estimate: 0.014,
      model: "gpt-4.1-mini",
      prompt_version: "v2",
      trigger: "manual",
      started_at: "2026-06-16T12:00:00.000Z",
      completed_at: "2026-06-16T12:00:00.000Z",
    });
  });

  it("redacts failed external logs and builds an issue context", () => {
    const payload = parseRunLogPayload({
      workflowId: "550e8400-e29b-41d4-a716-446655440000",
      status: "failed",
      latencyMs: 900,
      errorMessage: "Bearer secret-token failed for user@example.com",
    });
    const insert = buildRunLogCheckRunInsert({
      workflow,
      checkId: "check-1",
      payload,
      now: "2026-06-16T12:01:00.000Z",
    });

    expect(insert.status).toBe("failed");
    expect(insert.error_message).toBe("Bearer [redacted] failed for [redacted-email]");

    expect(buildRunLogIssueContext({
      workflow,
      checkId: "check-1",
      checkRunId: "run-1",
      payload,
      insert,
    })).toMatchObject({
      agencyId: "550e8400-e29b-41d4-a716-446655440001",
      clientId: "550e8400-e29b-41d4-a716-446655440002",
      workflowId: "550e8400-e29b-41d4-a716-446655440000",
      workflowName: "Lead Intake",
      checkId: "check-1",
      checkName: "External run log",
      checkRunId: "run-1",
      status: "failed",
      errorMessage: "Bearer [redacted] failed for [redacted-email]",
    });
  });
});
