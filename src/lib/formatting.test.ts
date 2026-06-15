import { describe, expect, it } from "vitest";
import { formatCurrency, formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";

describe("formatting helpers", () => {
  it("formats product-facing metrics consistently for Irish locale", () => {
    expect(formatCurrency(299)).toBe("€299");
    expect(formatPercentage(90.6)).toBe("91%");
    expect(formatDateTime("2026-06-14T20:29:00.000Z")).toContain("Jun");
  });

  it("uses minute, hour, and day buckets for relative workflow activity", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    expect(formatRelativeTime("2026-06-15T11:59:30.000Z", now)).toBe("1m ago");
    expect(formatRelativeTime("2026-06-15T10:00:00.000Z", now)).toBe("2h ago");
    expect(formatRelativeTime("2026-06-13T12:00:00.000Z", now)).toBe("2d ago");
  });
});
