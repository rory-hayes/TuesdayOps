import { describe, expect, it } from "vitest";
import {
  buildChecksRunSeries,
  buildIssuesBySeveritySeries,
  buildPassRateTrend,
} from "./charts";

describe("dashboard chart helpers", () => {
  it("builds a daily pass-rate trend from check runs", () => {
    expect(buildPassRateTrend([
      { status: "healthy", completedAt: "2026-06-01T10:00:00.000Z" },
      { status: "failed", completedAt: "2026-06-01T11:00:00.000Z" },
      { status: "healthy", completedAt: "2026-06-02T10:00:00.000Z" },
    ])).toEqual([
      { label: "Jun 1", value: 50 },
      { label: "Jun 2", value: 100 },
    ]);
  });

  it("builds daily check volume", () => {
    expect(buildChecksRunSeries([
      { completedAt: "2026-06-01T10:00:00.000Z" },
      { completedAt: "2026-06-01T11:00:00.000Z" },
      { completedAt: "2026-06-02T10:00:00.000Z" },
    ])).toEqual([
      { label: "Jun 1", value: 2 },
      { label: "Jun 2", value: 1 },
    ]);
  });

  it("builds issue severity counts in risk order", () => {
    expect(buildIssuesBySeveritySeries([
      { severity: "low", status: "open" },
      { severity: "critical", status: "open" },
      { severity: "high", status: "resolved" },
      { severity: "high", status: "in_review" },
    ])).toEqual([
      { label: "Critical", value: 1 },
      { label: "High", value: 1 },
      { label: "Medium", value: 0 },
      { label: "Low", value: 1 },
    ]);
  });
});
