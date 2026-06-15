import { describe, expect, it } from "vitest";
import { buildReportSendRedirect } from "./send-feedback";

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
    ).toBe("/reports/report-123?error=Missing%20RESEND_API_KEY.");
  });

  it("uses a safe fallback when a failed send has no message", () => {
    expect(
      buildReportSendRedirect({
        reportId: "report-123",
        status: "failed",
      }),
    ).toBe("/reports/report-123?error=Report%20email%20could%20not%20be%20sent.");
  });
});
