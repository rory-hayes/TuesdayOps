import { describe, expect, it } from "vitest";
import { getScheduledWindowStart, isCheckDue, selectDueChecks } from "./scheduler";

const now = new Date("2026-06-13T12:08:37.000Z");

describe("scheduled check selection", () => {
  it("rounds execution time down to a stable five-minute window", () => {
    expect(getScheduledWindowStart(now).toISOString()).toBe("2026-06-13T12:05:00.000Z");
  });

  it("treats checks with no previous run as due", () => {
    expect(isCheckDue({ now, latestCompletedAt: null, frequencyMinutes: 15 })).toBe(true);
  });

  it("waits until the workflow frequency has elapsed", () => {
    expect(
      isCheckDue({
        now,
        latestCompletedAt: "2026-06-13T11:50:00.000Z",
        frequencyMinutes: 15,
      }),
    ).toBe(true);
    expect(
      isCheckDue({
        now,
        latestCompletedAt: "2026-06-13T11:58:00.000Z",
        frequencyMinutes: 15,
      }),
    ).toBe(false);
  });

  it("selects only enabled endpoint checks that are due", () => {
    expect(
      selectDueChecks(
        [
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
            id: "recent",
            agencyId: "agency-1",
            workflowId: "workflow-2",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 15,
            enabled: true,
            latestCompletedAt: "2026-06-13T12:00:00.000Z",
          },
          {
            id: "disabled",
            agencyId: "agency-1",
            workflowId: "workflow-3",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 5,
            enabled: false,
            latestCompletedAt: null,
          },
          {
            id: "missing-endpoint",
            agencyId: "agency-1",
            workflowId: "workflow-4",
            workflowEndpointUrl: "",
            workflowFrequencyMinutes: 5,
            enabled: true,
            latestCompletedAt: null,
          },
        ],
        now,
        10,
      ).map((check) => check.id),
    ).toEqual(["due"]);
  });

  it("selects a targeted due check before applying the batch limit", () => {
    expect(
      selectDueChecks(
        [
          {
            id: "older-due",
            agencyId: "agency-1",
            workflowId: "workflow-1",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 5,
            enabled: true,
            latestCompletedAt: null,
          },
          {
            id: "target",
            agencyId: "agency-1",
            workflowId: "workflow-2",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 5,
            enabled: true,
            latestCompletedAt: null,
          },
        ],
        now,
        1,
        { checkId: "target" },
      ).map((check) => check.id),
    ).toEqual(["target"]);
  });
});
