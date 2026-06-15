import { describe, expect, it } from "vitest";
import { formatActionError } from "@/lib/server-actions/feedback";

describe("formatActionError", () => {
  it("preserves allowlisted user-facing action messages", () => {
    expect(formatActionError(new Error("Upgrade to monitor more workflows."))).toBe(
      "Upgrade to monitor more workflows.",
    );
    expect(formatActionError(new Error("Workflow was not found or is not accessible."))).toBe(
      "Workflow was not found or is not accessible.",
    );
    expect(formatActionError(new Error("Private or local workflow endpoints are blocked in production."))).toBe(
      "Private or local workflow endpoints are blocked in production.",
    );
  });

  it("sanitizes database and provider internals before showing action errors", () => {
    const message = formatActionError(
      new Error(
        'duplicate key value violates unique constraint "workflows_agency_id_slug_key" for ops@example.com token=abc123',
      ),
      "Workflow could not be saved.",
    );

    expect(message).toBe("Workflow could not be saved.");
    expect(message).not.toContain("workflows_agency_id_slug_key");
    expect(message).not.toContain("ops@example.com");
    expect(message).not.toContain("abc123");
    expect(formatActionError(new Error("Check run could not be saved: RLS denied"), "Check run failed.")).toBe(
      "Check run failed.",
    );
    expect(formatActionError(new Error("Unable to create synthetic issue: 23505"), "Test pack run failed.")).toBe(
      "Test pack run failed.",
    );
    expect(formatActionError(new Error("Report is blocked: Report has no check runs for this period."))).toBe(
      "Report is blocked: Report has no check runs for this period.",
    );
  });

  it("redacts sensitive fragments in otherwise useful provider errors", () => {
    const message = formatActionError(
      new Error("Endpoint request failed for Bearer secret_123 with api_key=sk-live-token"),
      "Check run failed.",
    );

    expect(message).toContain("Endpoint request failed");
    expect(message).toContain("Bearer [redacted]");
    expect(message).toContain("api_key=[redacted]");
    expect(message).not.toContain("secret_123");
    expect(message).not.toContain("sk-live-token");
  });
});
