import { describe, expect, it } from "vitest";
import { buildCheckRunInsert, isDuplicateScheduledRunError } from "./execution";

describe("check execution persistence helpers", () => {
  it("adds scheduled metadata to scheduled check run inserts", () => {
    expect(
      buildCheckRunInsert({
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        checkId: "check-1",
        trigger: "scheduled",
        scheduledFor: "2026-06-13T12:05:00.000Z",
        result: {
          status: "healthy",
          statusCode: 200,
          latencyMs: 120,
          responseSummary: "{\"ok\":true}",
          assertionResults: [],
          startedAt: "2026-06-13T12:05:01.000Z",
          completedAt: "2026-06-13T12:05:02.000Z",
        },
      }),
    ).toMatchObject({
      agency_id: "agency-1",
      client_id: "client-1",
      workflow_id: "workflow-1",
      check_id: "check-1",
      trigger: "scheduled",
      scheduled_for: "2026-06-13T12:05:00.000Z",
      status: "healthy",
    });
  });

  it("does not attach scheduled window metadata to manual check runs", () => {
    expect(
      buildCheckRunInsert({
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        checkId: "check-1",
        trigger: "manual",
        result: {
          status: "failed",
          latencyMs: 250,
          responseSummary: "",
          assertionResults: [],
          errorMessage: "Request timed out.",
          startedAt: "2026-06-13T12:05:01.000Z",
          completedAt: "2026-06-13T12:05:02.000Z",
        },
      }),
    ).toMatchObject({
      trigger: "manual",
      scheduled_for: null,
    });
  });

  it("recognizes duplicate scheduled run errors as idempotent skips", () => {
    expect(isDuplicateScheduledRunError({ code: "23505" })).toBe(true);
    expect(isDuplicateScheduledRunError({ code: "42501" })).toBe(false);
    expect(isDuplicateScheduledRunError(null)).toBe(false);
  });
});
