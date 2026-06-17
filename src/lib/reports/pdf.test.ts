import { describe, expect, it } from "vitest";
import type { ReportDraft } from "@/lib/domain/types";
import { buildReportEmail, buildReportPdfAttachment, renderReportPdfBytes } from "@/lib/reports/pdf";

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

  it("renders a client-ready report layout with scorecard and value sections", () => {
    const bytes = renderReportPdfBytes(draft);
    const text = bytes.toString("latin1");

    expect(text).toContain("TuesdayOps maintenance report");
    expect(text).toContain("Prepared for Client One");
    expect(text).toContain("Report period: June 2026");
    expect(text).toContain("Executive summary");
    expect(text).toContain("Operations scorecard");
    expect(text).toContain("Value delivered");
    expect(text).toContain("Next actions");
    expect(text).toContain("1 issue resolved before the next client report");
    expect(text).toContain("/BaseFont /Helvetica-Bold");
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

  it("builds a PDF attachment with a safe filename", () => {
    const bytes = renderReportPdfBytes(draft);

    expect(
      buildReportPdfAttachment({
        report: {
          ...draft,
          clientName: "Client One / Support <Team>",
        },
        pdfBytes: bytes,
      }),
    ).toEqual({
      filename: "client-one-support-team-2026-06-maintenance-report.pdf",
      content: bytes,
      contentType: "application/pdf",
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

  it("removes script-like report values from email and PDF artifacts", () => {
    const report = {
      ...draft,
      clientName: "ACME <script>alert(1)</script>",
      summary: 'Resolved <img src=x onerror=alert("xss")> incident without exposing token=secret.',
      items: [
        {
          category: "issues_resolved" as const,
          title: "<script>alert(1)</script> issue",
          body: "Latest resolution: <script>alert(1)</script>",
          sortOrder: 30,
        },
      ],
    };
    const email = buildReportEmail({
      report,
      downloadUrl: "https://app.example.com/api/reports/report-1/download",
    });
    const pdfText = renderReportPdfBytes(report).toString("latin1");
    const serialized = [email.subject, email.text, email.html, pdfText].join("\n");

    expect(serialized).not.toContain("<script");
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<img");
    expect(serialized).not.toContain("onerror");
    expect(serialized).not.toContain("alert(1)");
    expect(serialized).not.toContain('alert("xss")');
    expect(serialized).not.toContain("token=secret");
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

  it("keeps PDFs valid when optional report copy is blank", () => {
    const bytes = renderReportPdfBytes({
      ...draft,
      items: [
        {
          category: "qa_checks",
          title: "QA checks run",
          body: "",
          sortOrder: 40,
        },
      ],
    });
    const text = bytes.toString("latin1");

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("QA checks run");
    expect(text).toContain("() Tj T*");
  });
});
