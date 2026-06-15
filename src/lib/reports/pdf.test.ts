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

  it("escapes HTML-sensitive report values and redacts secrets in emails", () => {
    const email = buildReportEmail({
      report: {
        ...draft,
        clientName: "ACME <Support>",
        summary: 'Investigate user@example.com with Bearer token_123 and password="bad".',
        metrics: {
          ...draft.metrics,
          workflowsMonitored: 1,
          checksRun: 1,
          testRuns: 1,
        },
      },
      downloadUrl: 'https://app.example.com/reports?client="acme"&token=secret',
    });

    expect(email.text).toContain("Monitoring coverage: 1 workflow, 1 check, 1 synthetic run");
    expect(email.text).toContain("[redacted-email]");
    expect(email.text).toContain("Bearer [redacted]");
    expect(email.text).toContain("password=[redacted]");
    expect(email.html).toContain("ACME &lt;Support&gt;");
    expect(email.html).toContain("&quot;acme&quot;");
    expect(email.html).not.toContain("user@example.com");
    expect(email.html).not.toContain("Bearer token_123");
  });

  it("wraps long PDF lines and escapes PDF control characters", () => {
    const bytes = renderReportPdfBytes({
      ...draft,
      clientName: "Client (One) \\ Support",
      summary: "A".repeat(180),
    });
    const text = bytes.toString("latin1");

    expect(text).toContain("Client \\(One\\) \\\\ Support June 2026 Report");
    expect(text).toContain(`${"A".repeat(88)}) Tj T*`);
  });
});
