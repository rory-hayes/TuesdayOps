import { describe, expect, it } from "vitest";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { buildOperationalReliability } from "./operational-reliability";

describe("buildOperationalReliability", () => {
  it("marks operations ready when checks are enabled, fresh, and reports are ready", () => {
    const data = buildData({
      workflowLastCheckAt: "2026-06-14T09:00:00.000Z",
      issueSeverity: "low",
      issueStatus: "resolved",
      reportStatus: "ready_to_send",
    });

    expect(buildOperationalReliability({
      data,
      now: new Date("2026-06-14T10:00:00.000Z"),
    })).toMatchObject({
      ready: true,
      blockers: [],
      checks: [
        expect.objectContaining({ id: "enabled_checks", status: "ready" }),
        expect.objectContaining({ id: "stale_workflows", status: "ready" }),
        expect.objectContaining({ id: "critical_issues", status: "ready" }),
        expect.objectContaining({ id: "report_queue", status: "ready" }),
      ],
    });
  });

  it("flags missing enabled checks, stale workflows, critical issues, and missing reports", () => {
    const data = buildData({
      enabledCheck: false,
      workflowLastCheckAt: "2026-06-10T09:00:00.000Z",
      issueSeverity: "critical",
      issueStatus: "open",
      reportStatus: "draft",
    });

    const reliability = buildOperationalReliability({
      data,
      now: new Date("2026-06-14T10:00:00.000Z"),
    });

    expect(reliability.ready).toBe(false);
    expect(reliability.blockers).toEqual([
      "No enabled health checks are configured.",
      "1 monitored workflow has stale check data.",
      "1 high or critical issue is still open.",
      "No client report is ready to send or sent.",
    ]);
  });
});

function buildData({
  enabledCheck = true,
  workflowLastCheckAt,
  issueSeverity,
  issueStatus,
  reportStatus,
}: {
  enabledCheck?: boolean;
  workflowLastCheckAt: string;
  issueSeverity: "low" | "medium" | "high" | "critical";
  issueStatus: "open" | "in_review" | "resolved" | "ignored";
  reportStatus: "draft" | "ready_to_send" | "sent" | "failed";
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
        lastActivityAt: workflowLastCheckAt,
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
        lastCheckAt: workflowLastCheckAt,
        includedInReports: true,
      },
    ],
    checks: [
      {
        id: "check-1",
        agencyId: "agency-1",
        workflowId: "workflow-1",
        name: "Health",
        type: "health",
        schedule: "Every 60 minutes",
        enabled: enabledCheck,
        assertionCount: 2,
        latestStatus: "healthy",
      },
    ],
    checkRuns: [],
    issues: [
      {
        id: "issue-1",
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        severity: issueSeverity,
        status: issueStatus,
        title: "Issue",
        description: "Description",
        suggestedAction: "Action",
        owner: "Unassigned",
        reportable: true,
        occurrenceCount: 1,
        detectedAt: "2026-06-14T08:00:00.000Z",
        lastSeenAt: "2026-06-14T08:00:00.000Z",
      },
    ],
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
        status: reportStatus,
        checksRun: 10,
        issuesCaught: 1,
        issuesResolved: issueStatus === "resolved" ? 1 : 0,
        workflowsMonitored: 1,
        passRate: 100,
        summary: "Summary",
        recommendations: [],
      },
    ],
    reportItems: [],
  };
}
