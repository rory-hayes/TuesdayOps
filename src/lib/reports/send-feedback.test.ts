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
});
