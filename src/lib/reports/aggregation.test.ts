import { describe, expect, it } from "vitest";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { buildReportDraft } from "@/lib/reports/aggregation";

const baseData: TuesdayOpsSeedData = {
  agency: {
    id: "agency-1",
    name: "Agency One",
    slug: "agency-one",
    primaryColor: "#7C6CF2",
    plan: "starter",
    billingStatus: "trialing",
  },
  clients: [
    {
      id: "client-1",
      agencyId: "agency-1",
      name: "Client One",
      slug: "client-one",
      industry: "Services",
      owner: "Owner",
      reportRecipientEmail: "ops@example.com",
      reportStatus: "not_started",
      healthScore: 90,
      lastActivityAt: "2026-06-12T12:00:00.000Z",
      notes: "",
      archived: false,
    },
  ],
  workflows: [
    {
      id: "workflow-1",
      agencyId: "agency-1",
      clientId: "client-1",
      name: "Lead Intake",
      type: "webhook",
      environment: "production",
      endpointUrl: "https://example.com/intake",
      method: "POST",
      authType: "none",
      checkFrequencyMinutes: 15,
      status: "failed",
      passRate: 50,
      latencyMs: 720,
      monthlyCost: 25,
      lastCheckAt: "2026-06-13T10:00:00.000Z",
      includedInReports: true,
    },
  ],
  checks: [],
  checkRuns: [
    {
      id: "run-1",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      checkId: "check-1",
      status: "healthy",
      statusCode: 200,
      latencyMs: 200,
      responseSummary: "safe summary",
      startedAt: "2026-06-05T10:00:00.000Z",
      completedAt: "2026-06-05T10:00:01.000Z",
    },
    {
      id: "run-2",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      checkId: "check-1",
      status: "failed",
      statusCode: 500,
      latencyMs: 900,
      responseSummary: "raw payload token=secret should not appear",
      errorMessage: "Expected status 200, received 500.",
      startedAt: "2026-06-06T10:00:00.000Z",
      completedAt: "2026-06-06T10:00:01.000Z",
    },
    {
      id: "run-outside-period",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      checkId: "check-1",
      status: "failed",
      latencyMs: 900,
      responseSummary: "outside period",
      startedAt: "2026-05-06T10:00:00.000Z",
      completedAt: "2026-05-06T10:00:01.000Z",
    },
  ],
  issues: [
    {
      id: "issue-1",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      checkRunId: "run-2",
      severity: "high",
      status: "resolved",
      title: "Lead intake returned 500",
      description: "Endpoint failed during the report period.",
      suggestedAction: "Review endpoint credentials.",
      owner: "Owner",
      reportable: true,
      occurrenceCount: 2,
      detectedAt: "2026-06-06T10:00:00.000Z",
      lastSeenAt: "2026-06-06T11:00:00.000Z",
      resolvedAt: "2026-06-07T09:00:00.000Z",
      resolutionNote: "Refreshed credentials and reran the health check.",
    },
  ],
  testPacks: [
    {
      id: "pack-1",
      agencyId: "agency-1",
      workflowId: "workflow-1",
      name: "Lead intake regression",
      description: "Core intake cases",
      enabled: true,
      caseCount: 2,
      passRate: 50,
      lastRunAt: "2026-06-08T10:00:00.000Z",
    },
  ],
  testCases: [],
  testRuns: [
    {
      id: "test-run-1",
      agencyId: "agency-1",
      workflowId: "workflow-1",
      testPackId: "pack-1",
      testCaseId: "case-1",
      status: "passed",
      statusCode: 200,
      latencyMs: 300,
      responseSummary: "ok",
      createdAt: "2026-06-08T10:00:00.000Z",
    },
    {
      id: "test-run-2",
      agencyId: "agency-1",
      workflowId: "workflow-1",
      testPackId: "pack-1",
      testCaseId: "case-2",
      status: "failed",
      statusCode: 422,
      latencyMs: 420,
      responseSummary: "missing field",
      errorMessage: "Expected field result.id to exist.",
      createdAt: "2026-06-08T10:02:00.000Z",
    },
  ],
  reports: [],
  reportItems: [],
};

describe("report aggregation", () => {
  it("aggregates report-safe client proof metrics for the selected period", () => {
    const draft = buildReportDraft({
      data: baseData,
      clientId: "client-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });

    expect(draft.summary).toContain("Client One");
    expect(draft.metrics).toMatchObject({
      workflowsMonitored: 1,
      checksRun: 2,
      issuesCaught: 1,
      issuesResolved: 1,
      testRuns: 2,
      testFailures: 1,
      passRate: 50,
    });
    expect(draft.items.map((item) => item.category)).toEqual([
      "workflow_health",
      "issues_caught",
      "issues_resolved",
      "qa_checks",
    ]);
  });

  it("does not include raw response summaries or secret-like material", () => {
    const draft = buildReportDraft({
      data: baseData,
      clientId: "client-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });
    const serialized = JSON.stringify(draft);

    expect(serialized).not.toContain("raw payload");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("Expected status 200");
  });
});
