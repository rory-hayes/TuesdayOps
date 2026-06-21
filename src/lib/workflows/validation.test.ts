import { describe, expect, it } from "vitest";
import {
  buildWorkflowFormFieldErrors,
  formatWorkflowFormValidationSummary,
  workflowFormSchema,
} from "@/lib/workflows/validation";

describe("workflow form validation", () => {
  it("maps bypassed invalid health check ranges to specific field messages", () => {
    const parsed = workflowFormSchema.safeParse(workflowFormInput({
      checkFrequencyMinutes: "0",
      expectedStatus: "999",
      maxLatencyMs: "0",
      timeoutMs: "0",
    }));

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const fieldErrors = buildWorkflowFormFieldErrors(parsed.error.issues);

      expect(fieldErrors).toMatchObject({
        checkFrequencyMinutes: "Frequency must be 5-10080 minutes.",
        expectedStatus: "Expected status must be 100-599.",
        maxLatencyMs: "Max latency must be 100-60000 ms.",
        timeoutMs: "Timeout must be 1000-60000 ms.",
      });
      expect(formatWorkflowFormValidationSummary(fieldErrors)).toBe(
        "Frequency must be 5-10080 minutes. Expected status must be 100-599. Max latency must be 100-60000 ms. Timeout must be 1000-60000 ms.",
      );
    }
  });

  it("accepts the documented lower bounds for manual workflow checks", () => {
    const parsed = workflowFormSchema.safeParse(workflowFormInput({
      checkFrequencyMinutes: "5",
      expectedStatus: "100",
      maxLatencyMs: "100",
      timeoutMs: "1000",
    }));

    expect(parsed.success).toBe(true);
  });
});

function workflowFormInput(overrides: Partial<Record<string, string>>) {
  return {
    clientId: "11111111-1111-4111-8111-111111111111",
    name: "Lead intake",
    type: "http_endpoint",
    environment: "production",
    endpointUrl: "https://example.com/api/health",
    method: "GET",
    authType: "none",
    checkFrequencyMinutes: "60",
    expectedStatus: "200",
    maxLatencyMs: "5000",
    timeoutMs: "10000",
    ...overrides,
  };
}
