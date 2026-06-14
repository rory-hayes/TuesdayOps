import { describe, expect, it } from "vitest";
import type { ReportDraft } from "@/lib/domain/types";
import { buildReportEmail, renderReportPdfBytes } from "@/lib/reports/pdf";

const draft: ReportDraft = {
  clientId: "client-1",
  clientName: "Client One",
  period: "2026-06",
  periodLabel: "June 2026",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  summary: "June 2026 report for Client One with safe client-facing summary.",
  metrics: {
    workflowsMonitored: 2,
    checksRun: 12,
    issuesCaught: 1,
    issuesResolved: 1,
    testRuns: 4,
    testFailures: 1,
    passRate: 92,
  },
  recommendations: ["Keep the current monitoring cadence."],
  items: [
    {
      category: "workflow_health",
      title: "Workflow health overview",
      body: "2 workflows monitored with a 92% pass rate.",
      sortOrder: 10,
    },
  ],
};

describe("report PDF helpers", () => {
  it("renders a downloadable PDF byte stream with report-safe text", () => {
    const bytes = renderReportPdfBytes(draft);
    const text = bytes.toString("latin1");

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Client One");
    expect(text).toContain("Monitoring coverage: 2 workflows, 12 checks, 4 synthetic runs");
    expect(text).toContain("Workflow health overview");
    expect(text).not.toContain("token=secret");
  });

  it("builds a client-safe report email with a download link", () => {
    expect(
      buildReportEmail({
        report: draft,
        downloadUrl: "https://app.example.com/api/reports/report-1/download",
      }),
    ).toMatchObject({
      subject: "Client One June 2026 maintenance report",
      text: expect.stringContaining("Monitoring coverage: 2 workflows, 12 checks, 4 synthetic runs"),
    });
  });
});
