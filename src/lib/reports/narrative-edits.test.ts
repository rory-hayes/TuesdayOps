import { describe, expect, it } from "vitest";
import { prepareReportNarrativeEdit } from "@/lib/reports/narrative-edits";

describe("prepareReportNarrativeEdit", () => {
  it("sanitizes report summary edits before persistence", () => {
    expect(
      prepareReportNarrativeEdit({
        field: "summary",
        value: 'Resolved issue for user@example.com without exposing token=secret <script>alert("x")</script>',
      }),
    ).toEqual({
      target: "report",
      auditField: "summary",
      updates: {
        summary: "Resolved issue for [redacted-email] without exposing token=[redacted] [redacted]",
      },
    });
  });

  it("normalizes recommendations into report-safe lines", () => {
    expect(
      prepareReportNarrativeEdit({
        field: "recommendations",
        value: "Keep monitoring cadence.\n\nRotate Bearer token_123 before next review.",
      }),
    ).toEqual({
      target: "report",
      auditField: "recommendations",
      updates: {
        recommendations_json: [
          "Keep monitoring cadence.",
          "Rotate Bearer [redacted] before next review.",
        ],
      },
    });
  });

  it("rejects empty required copy fields", () => {
    expect(() => prepareReportNarrativeEdit({ field: "itemBody", value: "   " })).toThrow(
      "Report item body cannot be empty.",
    );
  });
});
