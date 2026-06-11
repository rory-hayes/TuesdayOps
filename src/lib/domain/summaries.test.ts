import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/data/seed";
import { getOpenIssues, getPortfolioSummary, getReportSummary } from "./summaries";

describe("TuesdayOps domain summaries", () => {
  it("counts active clients, monitored workflows, open issues, and check pass rate", () => {
    const summary = getPortfolioSummary(seedData);

    expect(summary.activeClients).toBe(4);
    expect(summary.monitoredWorkflows).toBe(9);
    expect(summary.openIssues).toBe(5);
    expect(summary.checkPassRate).toBe(91);
  });

  it("returns only unresolved reportable issues by default", () => {
    const issues = getOpenIssues(seedData);

    expect(issues).toHaveLength(5);
    expect(issues.every((issue) => issue.status !== "resolved")).toBe(true);
    expect(issues.every((issue) => issue.reportable)).toBe(true);
  });

  it("aggregates client report proof metrics for a period", () => {
    const report = getReportSummary(seedData, "client-nova", "2026-06");

    expect(report.clientName).toBe("Nova Dental Group");
    expect(report.checksRun).toBe(1240);
    expect(report.issuesCaught).toBe(7);
    expect(report.issuesResolved).toBe(6);
  });
});
