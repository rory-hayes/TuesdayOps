import { describe, expect, it } from "vitest";
import { buildReportSendRedirect, formatReportSendError } from "./send-feedback";

describe("buildReportSendRedirect", () => {
  it("returns a success notice when report email delivery succeeds", () => {
    expect(
      buildReportSendRedirect({
        reportId: "report-123",
        status: "sent",
      }),
    ).toBe("/reports/report-123?notice=Report%20email%20sent.");
  });

  it("returns an error redirect when report email delivery fails", () => {
    expect(
      buildReportSendRedirect({
        reportId: "report-123",
        status: "failed",
        message: "Missing RESEND_API_KEY.",
      }),
    ).toBe(
      "/reports/report-123?error=Report%20email%20could%20not%20be%20sent%20because%20email%20delivery%20is%20not%20configured.",
    );
  });

  it("uses a safe fallback when a failed send has no message", () => {
    expect(
      buildReportSendRedirect({
        reportId: "report-123",
        status: "failed",
      }),
    ).toBe("/reports/report-123?error=Report%20email%20could%20not%20be%20sent.");
  });

  it("redacts provider details and secret-shaped fragments from report send failures", () => {
    expect(
      buildReportSendRedirect({
        reportId: "report-123",
        status: "failed",
        message: "Resend alert failed for ops@example.com with Bearer token_123.",
      }),
    ).toBe(
      "/reports/report-123?error=Report%20email%20could%20not%20be%20sent.%20Check%20the%20recipient%20and%20try%20again.",
    );
  });

  it("prompts for a missing recipient before trying delivery", () => {
    expect(formatReportSendError(new Error("Recipient email is missing."))).toBe(
      "Add a report recipient email for this client before sending.",
    );
  });

  it("treats missing email sender configuration as operator setup", () => {
    expect(formatReportSendError("Missing from email address")).toBe(
      "Report email could not be sent because email delivery is not configured.",
    );
  });

  it("uses safe action feedback for non-provider failures", () => {
    expect(formatReportSendError(new Error("Report is blocked: readiness is blocked."))).toBe(
      "Report is blocked: readiness is blocked.",
    );
  });

  it("falls back when formatted feedback still resembles a secret", () => {
    expect(formatReportSendError(new Error("Provider returned OPENAI_API_KEY"))).toBe(
      "Report email could not be sent.",
    );
  });
});
