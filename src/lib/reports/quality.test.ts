import { describe, expect, it } from "vitest";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { buildReportQuality } from "./quality";

describe("buildReportQuality", () => {
  it("marks a report ready when source data, sections, and recommendations are present", () => {
    expect(buildReportQuality({
      data: buildData({ checksRun: 12, openHighRiskIssues: 0, recommendations: ["Keep monitoring cadence."] }),
      reportId: "report-1",
    })).toMatchObject({
      status: "ready",
      score: 100,
      blockers: [],
      warnings: [],
    });
  });

  it("blocks report send readiness when source data is missing", () => {
    const quality = buildReportQuality({
      data: buildData({ checksRun: 0, openHighRiskIssues: 0, recommendations: [] }),
      reportId: "report-1",
    });

    expect(quality.status).toBe("blocked");
    expect(quality.score).toBeLessThan(70);
    expect(quality.blockers).toContain("Report has no check runs for this period.");
    expect(quality.warnings).toContain("Report has no client-safe recommendations.");
  });

  it("marks reports for review when high-risk issues are still open", () => {
    const quality = buildReportQuality({
      data: buildData({ checksRun: 12, openHighRiskIssues: 1, recommendations: ["Resolve open risk."] }),
      reportId: "report-1",
    });

    expect(quality.status).toBe("review");
    expect(quality.warnings).toContain("1 high or critical issue is still open for this client.");
  });
});

function buildData({
  checksRun,
  openHighRiskIssues,
  recommendations,
}: {
  checksRun: number;
  openHighRiskIssues: number;
  recommendations: string[];
}): TuesdayOpsSeedData {
  return {
    agency: {
      id: "agency-1",
      name: "Agency",
      slug: "agency",
      primaryColor: "#7C6CF2",
      plan: "starter",
      billingStatus: "trialing",
    },
    clients: [
      {
        id: "client-1",
        agencyId: "agency-1",
        name: "Client",
        slug: "client",
        industry: "AI",
        owner: "Owner",
        reportRecipientEmail: "client@example.com",
        reportStatus: "not_started",
        healthScore: 95,
        lastActivityAt: "2026-06-14T08:00:00.000Z",
        notes: "",
        archived: false,
      },
    ],
    workflows: [
      {
        id: "workflow-1",
        agencyId: "agency-1",
        clientId: "client-1",
        name: "Workflow",
        type: "http_endpoint",
        environment: "production",
        endpointUrl: "https://api.example.com/health",
        method: "GET",
        authType: "none",
        checkFrequencyMinutes: 60,
        status: "healthy",
        passRate: 100,
        latencyMs: 250,
        monthlyCost: 0,
        lastCheckAt: "2026-06-14T08:00:00.000Z",
        includedInReports: true,
      },
    ],
    checks: [],
    checkRuns: [],
    issues: Array.from({ length: openHighRiskIssues }, (_, index) => ({
      id: `issue-${index}`,
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      severity: "critical" as const,
      status: "open" as const,
      title: "Critical issue",
      description: "Description",
      suggestedAction: "Action",
      owner: "Unassigned",
      reportable: true,
      occurrenceCount: 1,
      detectedAt: "2026-06-14T08:00:00.000Z",
      lastSeenAt: "2026-06-14T08:00:00.000Z",
    })),
    testPacks: [],
    testCases: [],
    testRuns: [],
    reports: [
      {
        id: "report-1",
        agencyId: "agency-1",
        clientId: "client-1",
        clientName: "Client",
        period: "2026-06",
        periodLabel: "June 2026",
        status: "ready_to_send",
        checksRun,
        issuesCaught: openHighRiskIssues,
        issuesResolved: 0,
        workflowsMonitored: 1,
        passRate: checksRun > 0 ? 100 : 0,
        summary: "June 2026 report for Client with client-safe monitoring proof.",
        recommendations,
      },
    ],
    reportItems: [
      {
        id: "item-1",
        agencyId: "agency-1",
        reportId: "report-1",
        category: "workflow_health",
        title: "Workflow health overview",
        body: "1 workflow monitored.",
        sortOrder: 10,
      },
    ],
  };
}
