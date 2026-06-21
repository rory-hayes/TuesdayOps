import { describe, expect, it } from "vitest";
import {
  buildIssueAlertEmail,
  redactAlertText,
  shouldSendIssueAlert,
} from "@/lib/alerts/issue-alerts";

const highSeverityIssue = {
  id: "issue-123",
  severity: "high" as const,
  title: "Risk router returned HTTP 500",
  description: "Endpoint health received HTTP 500 instead of the expected status code.",
  suggestedAction: "Review the workflow endpoint and recent deployment changes.",
};

describe("issue alert policy", () => {
  it("sends only newly-created high or critical issues", () => {
    expect(shouldSendIssueAlert({ created: true, severity: "high" })).toBe(true);
    expect(shouldSendIssueAlert({ created: true, severity: "critical" })).toBe(true);
    expect(shouldSendIssueAlert({ created: true, severity: "medium" })).toBe(false);
    expect(shouldSendIssueAlert({ created: false, severity: "critical" })).toBe(false);
  });
});

describe("issue alert safe copy", () => {
  it("redacts secret-like material before email copy is built", () => {
    expect(
      redactAlertText(
        'Bearer abc.def.ghi failed for ops@example.com with "api_key": "sk-live-123" and password=secret',
      ),
    ).toBe(
      'Bearer [redacted] failed for [redacted-email] with "api_key":"[redacted]" and password=[redacted]',
    );
  });

  it("builds a client-safe high-severity alert email", () => {
    const email = buildIssueAlertEmail({
      issue: {
        ...highSeverityIssue,
        title: "Risk router token=abc123 returned HTTP 500",
      },
      clientName: "Harbor Legal",
      workflowName: "Risk Router",
      checkName: "Endpoint health check",
      appUrl: "https://tuesday-ops.vercel.app",
    });

    expect(email.subject).toBe("[Maintain Flow] High issue for Harbor Legal: Risk router token=[redacted] returned HTTP 500");
    expect(email.text).toContain("Client: Harbor Legal");
    expect(email.text).toContain("Workflow: Risk Router");
    expect(email.text).toContain("Check: Endpoint health check");
    expect(email.text).toContain("Open Maintain Flow: https://tuesday-ops.vercel.app/issues");
    expect(email.text).not.toContain("abc123");
    expect(email.html).not.toContain("abc123");
  });

  it("uses critical copy and trims trailing app URL slashes", () => {
    const email = buildIssueAlertEmail({
      issue: {
        ...highSeverityIssue,
        severity: "critical",
      },
      clientName: "Harbor Legal",
      workflowName: "Risk Router",
      checkName: "Endpoint health check",
      appUrl: "https://tuesday-ops.vercel.app/",
    });

    expect(email.subject).toBe("[Maintain Flow] Critical issue for Harbor Legal: Risk router returned HTTP 500");
    expect(email.text).toContain("Critical severity issue detected in Maintain Flow.");
    expect(email.text).toContain("Open Maintain Flow: https://tuesday-ops.vercel.app/issues");
  });
});
