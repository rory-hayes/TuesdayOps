import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCurrency, formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";

describe("formatting helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats product-facing metrics consistently for Irish locale", () => {
    expect(formatCurrency(299)).toBe("€299");
    expect(formatPercentage(90.6)).toBe("91%");
    expect(formatDateTime("2026-06-14T20:29:00.000Z")).toContain("Jun");
  });

  it("uses minute, hour, and day buckets for relative workflow activity", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    expect(formatRelativeTime("2026-06-15T11:59:30.000Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-06-15T11:59:00.000Z", now)).toBe("1m ago");
    expect(formatRelativeTime("2026-06-15T11:57:30.000Z", now)).toBe("2m ago");
    expect(formatRelativeTime("2026-06-15T10:00:00.000Z", now)).toBe("2h ago");
    expect(formatRelativeTime("2026-06-13T12:00:00.000Z", now)).toBe("2d ago");
  });

  it("uses the current clock by default for fresh relative timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T19:15:30.000Z"));

    expect(formatRelativeTime("2026-06-21T19:15:01.000Z")).toBe("just now");
    expect(formatRelativeTime("2026-06-21T19:14:30.000Z")).toBe("1m ago");
  });
});
