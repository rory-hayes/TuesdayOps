import { describe, expect, it, vi } from "vitest";
import { runScheduledCheckBatch } from "./scheduled-runner";

const now = new Date("2026-06-13T12:08:37.000Z");

describe("scheduled check batch runner", () => {
  it("runs only due checks with a stable scheduled window", async () => {
    const executeCheckRun = vi.fn().mockResolvedValue({ status: "completed" });

    const result = await runScheduledCheckBatch({
      checks: [
        {
          id: "due",
          agencyId: "agency-1",
          workflowId: "workflow-1",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: "2026-06-13T12:00:00.000Z",
        },
        {
          id: "not-due",
          agencyId: "agency-1",
          workflowId: "workflow-2",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 15,
          enabled: true,
          latestCompletedAt: "2026-06-13T12:00:00.000Z",
        },
      ],
      now,
      limit: 10,
      executeCheckRun,
    });

    expect(executeCheckRun).toHaveBeenCalledTimes(1);
    expect(executeCheckRun).toHaveBeenCalledWith({
      agencyId: "agency-1",
      checkId: "due",
      scheduledFor: "2026-06-13T12:05:00.000Z",
      trigger: "scheduled",
    });
    expect(result).toEqual({ attempted: 1, completed: 1, skipped: 0, failed: 0 });
  });

  it("keeps processing when one scheduled check fails", async () => {
    const executeCheckRun = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ status: "skipped" });

    const result = await runScheduledCheckBatch({
      checks: [
        {
          id: "first",
          agencyId: "agency-1",
          workflowId: "workflow-1",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: null,
        },
        {
          id: "second",
          agencyId: "agency-1",
          workflowId: "workflow-2",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: null,
        },
      ],
      now,
      limit: 10,
      executeCheckRun,
    });

    expect(executeCheckRun).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ attempted: 2, completed: 0, skipped: 1, failed: 1 });
  });

  it("can target one due check for operational smoke tests", async () => {
    const executeCheckRun = vi.fn().mockResolvedValue({ status: "completed" });

    const result = await runScheduledCheckBatch({
      checks: [
        {
          id: "crowding-check",
          agencyId: "agency-1",
          workflowId: "workflow-1",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: null,
        },
        {
          id: "target-check",
          agencyId: "agency-2",
          workflowId: "workflow-2",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: null,
        },
      ],
      now,
      limit: 1,
      checkId: "target-check",
      executeCheckRun,
    });

    expect(executeCheckRun).toHaveBeenCalledTimes(1);
    expect(executeCheckRun).toHaveBeenCalledWith({
      agencyId: "agency-2",
      checkId: "target-check",
      scheduledFor: "2026-06-13T12:05:00.000Z",
      trigger: "scheduled",
    });
    expect(result).toEqual({ attempted: 1, completed: 1, skipped: 0, failed: 0 });
  });
});
