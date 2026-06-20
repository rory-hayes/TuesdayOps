/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportDetailPage } from "@/components/reports/report-detail-page";
import { ReportsPage } from "@/components/reports/reports-page";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("@/lib/reports/service", () => ({
  generateReportAction: "/reports/generate",
  generateReportPdfAction: "/reports/pdf",
  sendReportAction: "/reports/send",
  updateReportNarrativeAction: "/reports/narrative",
}));

describe("report pages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("asks for confirmation before sending the active report", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const data = makeData();
    const report = data.reports[0];

    render(<ReportDetailPage data={data} report={report} />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(confirm).toHaveBeenCalledWith("Are you sure you want to send report to Acme?");
  });

  it("renders a timestamped generated and sent report history", () => {
    render(<ReportsPage data={makeData()} />);

    expect(screen.getByRole("heading", { name: "Report history" })).toBeTruthy();
    expect(screen.getAllByText("Generated", { selector: "span" })).toHaveLength(2);
    expect(screen.getByText("Sent", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("Not sent yet")).toBeTruthy();
    expect(screen.getByText("ready to send")).toBeTruthy();
    expect(screen.getByText("sent")).toBeTruthy();
  });

  it("renders editable narrative controls for stored summary, report items, and recommendations", () => {
    const data = makeData();
    const report = data.reports[0];

    render(<ReportDetailPage data={data} report={report} />);

    expect(screen.getByRole("article", { name: "Client report preview" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit executive summary" }));
    expect(screen.getByDisplayValue(report.summary)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit Workflow health overview title" }));
    expect(screen.getByDisplayValue("Workflow health overview")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit Workflow health overview body" }));
    expect(screen.getByDisplayValue("Two production workflows stayed within the agreed maintenance window.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit recommendations" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(report.recommendations.join("\n"));
  });

  it("keeps sent reports read-only and preserves sent history", () => {
    const data = makeData();
    const report = data.reports[1];

    render(<ReportDetailPage data={data} report={report} />);

    expect(screen.getByRole("heading", { name: "Sent report preserved" })).toBeTruthy();
    expect(screen.getByText("This report has already been sent. Sent report history is preserved, so narrative edits are disabled.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit executive summary" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit recommendations" })).toBeNull();
  });
});

function makeData(): TuesdayOpsSeedData {
  return {
    agency: {
      id: "agency-1",
      name: "Northstar Automation",
      slug: "northstar",
      primaryColor: "#18181b",
      plan: "starter",
      billingStatus: "active",
    },
    clients: [
      {
        id: "client-1",
        agencyId: "agency-1",
        name: "Acme",
        slug: "acme",
        industry: "Services",
        owner: "Ops",
        reportRecipientEmail: "ops@example.invalid",
        reportStatus: "ready",
        reportAutomationEnabled: true,
        healthScore: 96,
        lastActivityAt: "2026-06-18T12:00:00.000Z",
        notes: "",
        archived: false,
      },
    ],
    workflows: [
      {
        id: "workflow-1",
        agencyId: "agency-1",
        clientId: "client-1",
        name: "Lead intake",
        type: "http_endpoint",
        environment: "production",
        endpointUrl: "https://example.com/lead",
        method: "POST",
        authType: "none",
        checkFrequencyMinutes: 60,
        status: "healthy",
        passRate: 98,
        latencyMs: 180,
        monthlyCost: 0,
        includedInReports: true,
      },
    ],
    checks: [
      {
        id: "check-1",
        agencyId: "agency-1",
        workflowId: "workflow-1",
        name: "Endpoint health",
        type: "health",
        schedule: "Every 60 minutes",
        enabled: true,
        configJson: {},
        assertionCount: 2,
        latestStatus: "healthy",
      },
    ],
    checkRuns: [
      {
        id: "run-1",
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        checkId: "check-1",
        status: "healthy",
        statusCode: 200,
        latencyMs: 180,
        responseSummary: "ok",
        startedAt: "2026-06-18T12:00:00.000Z",
        completedAt: "2026-06-18T12:00:01.000Z",
      },
    ],
    issues: [],
    testPacks: [],
    testCases: [],
    testRuns: [],
    workflowApiKeys: [],
    reports: [
      {
        id: "report-1",
        agencyId: "agency-1",
        clientId: "client-1",
        clientName: "Acme",
        period: "2026-06",
        periodLabel: "June 2026",
        status: "ready_to_send",
        checksRun: 42,
        issuesCaught: 2,
        issuesResolved: 2,
        workflowsMonitored: 2,
        passRate: 98,
        summary: "June maintenance kept Acme's client workflows healthy and reportable.",
        recommendations: [
          "Keep the current monitoring cadence.",
          "Review lead enrichment coverage next month.",
        ],
        generatedAt: "2026-06-18T10:15:00.000Z",
      },
      {
        id: "report-2",
        agencyId: "agency-1",
        clientId: "client-1",
        clientName: "Acme",
        period: "2026-05",
        periodLabel: "May 2026",
        status: "sent",
        checksRun: 39,
        issuesCaught: 1,
        issuesResolved: 1,
        workflowsMonitored: 2,
        passRate: 97,
        summary: "May maintenance summary.",
        recommendations: ["Keep monitoring cadence."],
        generatedAt: "2026-05-31T09:30:00.000Z",
        sentAt: "2026-05-31T10:00:00.000Z",
      },
    ],
    reportItems: [
      {
        id: "item-1",
        agencyId: "agency-1",
        reportId: "report-1",
        category: "workflow_health",
        title: "Workflow health overview",
        body: "Two production workflows stayed within the agreed maintenance window.",
        sortOrder: 10,
      },
      {
        id: "item-2",
        agencyId: "agency-1",
        reportId: "report-1",
        category: "issues_resolved",
        title: "Issues resolved",
        body: "Two reportable issues were resolved before month end.",
        sortOrder: 20,
      },
    ],
  };
}
