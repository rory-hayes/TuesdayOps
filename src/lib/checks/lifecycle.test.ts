import { describe, expect, it } from "vitest";
import { buildCheckDisableUpdate } from "./lifecycle";

describe("check lifecycle helpers", () => {
  it("disables checks instead of deleting check history", () => {
    expect(buildCheckDisableUpdate()).toEqual({
      enabled: false,
    });
  });
});
