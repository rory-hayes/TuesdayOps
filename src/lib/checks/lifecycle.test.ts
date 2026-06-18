import { describe, expect, it } from "vitest";
import {
  buildCheckDisableUpdate,
  buildManualCheckRunNotice,
  formatCheckConfigValidationError,
} from "./lifecycle";

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

  it("formats specific check edit validation errors", () => {
    expect(formatCheckConfigValidationError([
      { path: ["expectedStatus"], message: "Too small: expected number to be >=100" },
      { path: ["timeoutMs"], message: "Too big: expected number to be <=60000" },
      { path: ["matchesRegexPattern"], message: "Must be 500 or fewer characters" },
    ])).toBe("Expected status must be 100-599. Timeout must be 1000-60000 ms. Regex assertion must be 500 or fewer characters.");
  });
});
