import { describe, expect, it } from "vitest";
import { buildWorkflowArchiveUpdate } from "./lifecycle";

describe("workflow lifecycle helpers", () => {
  it("archives workflows without deleting historical data", () => {
    expect(buildWorkflowArchiveUpdate("2026-06-16T10:15:00.000Z")).toEqual({
      archived_at: "2026-06-16T10:15:00.000Z",
      included_in_reports: false,
    });
  });
});
