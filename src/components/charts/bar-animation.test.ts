import { describe, expect, it } from "vitest";
import { buildAnimatedBarStyle } from "@/components/charts/simple-charts";

describe("buildAnimatedBarStyle", () => {
  it("starts bars at zero scale while preserving the final width as a CSS variable", () => {
    expect(buildAnimatedBarStyle({ value: 18, max: 22, index: 2 })).toEqual({
      "--bar-target-width": "82%",
      animationDelay: "90ms",
      transform: "scaleX(0)",
      width: "82%",
    });
  });

  it("handles empty chart values without dividing by zero", () => {
    expect(buildAnimatedBarStyle({ value: 0, max: 0, index: 0 })).toEqual({
      "--bar-target-width": "0%",
      animationDelay: "0ms",
      transform: "scaleX(0)",
      width: "0%",
    });
  });
});
