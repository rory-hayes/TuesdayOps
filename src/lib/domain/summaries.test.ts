import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/data/seed";
import {
  getOpenIssues,
  getPortfolioSummary,
  getReportSummary,
  getWorkflowHealthRows,
} from "./summaries";

describe("Tuesday domain summaries", () => {
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

  it("returns workflow health rows with issue counts and unknown-client fallback", () => {
    const rows = getWorkflowHealthRows({
      ...seedData,
      workflows: [
        {
          ...seedData.workflows[0],
          id: "workflow-known",
          clientId: seedData.clients[0].id,
        },
        {
          ...seedData.workflows[0],
          id: "workflow-orphaned",
          clientId: "missing-client",
          name: "Orphaned workflow",
        },
      ],
      issues: [
        {
          ...seedData.issues[0],
          id: "issue-open",
          workflowId: "workflow-known",
          status: "open",
          reportable: true,
        },
        {
          ...seedData.issues[0],
          id: "issue-ignored",
          workflowId: "workflow-known",
          status: "ignored",
          reportable: true,
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        workflowId: "workflow-known",
        clientName: seedData.clients[0].name,
        openIssues: 1,
      }),
      expect.objectContaining({
        workflowId: "workflow-orphaned",
        clientName: "Unknown client",
      }),
    ]);
  });

  it("returns zero summary metrics for an empty portfolio and throws for missing reports", () => {
    expect(
      getPortfolioSummary({
        ...seedData,
        clients: [],
        workflows: [],
        issues: [],
      }),
    ).toEqual({
      activeClients: 0,
      monitoredWorkflows: 0,
      openIssues: 0,
      checkPassRate: 0,
    });

    expect(() => getReportSummary(seedData, "missing-client", "2026-06")).toThrow(
      "No report summary found for client missing-client in 2026-06.",
    );
  });
});
