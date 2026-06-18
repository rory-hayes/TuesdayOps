import { describe, expect, it } from "vitest";
import { buildCheckDisableUpdate, buildManualCheckRunNotice } from "./lifecycle";

describe("check lifecycle helpers", () => {
  it("disables checks instead of deleting check history", () => {
    expect(buildCheckDisableUpdate()).toEqual({
      enabled: false,
    });
  });

  it("builds status-specific manual check feedback", () => {
    expect(buildManualCheckRunNotice("healthy")).toBe("Check run passed. History was updated.");
    expect(buildManualCheckRunNotice("degraded")).toBe("Check run degraded. Review assertions and history.");
    expect(buildManualCheckRunNotice("failed")).toBe("Check run failed. Issue tracking and history were updated.");
    expect(buildManualCheckRunNotice("skipped")).toBe("Check run skipped. History was updated.");
  });
});
