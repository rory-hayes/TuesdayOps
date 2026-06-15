import { describe, expect, it } from "vitest";
import { formatBillingError } from "@/lib/billing/feedback";

describe("formatBillingError", () => {
  it("hides internal billing configuration details from customer-facing redirects", () => {
    expect(formatBillingError(new Error("Missing STRIPE_SECRET_KEY. This key is required for billing."))).toBe(
      "Billing is not configured. Contact support to finish subscription setup.",
    );
    expect(formatBillingError(new Error("Invalid NEXT_PUBLIC_APP_URL. Set it to an absolute http(s) URL."))).toBe(
      "Billing is not configured. Contact support to finish subscription setup.",
    );
  });

  it("keeps safe provider errors useful while redacting sensitive fragments", () => {
    const message = formatBillingError(
      new Error("Stripe request failed for ops@example.com with Bearer sk_test_secret123 token=abc123"),
    );

    expect(message).toContain("Stripe request failed");
    expect(message).toContain("[redacted-email]");
    expect(message).toContain("Bearer [redacted]");
    expect(message).toContain("token=[redacted]");
    expect(message).not.toContain("ops@example.com");
    expect(message).not.toContain("sk_test_secret123");
    expect(message).not.toContain("abc123");
  });

  it("falls back and caps very long messages", () => {
    expect(formatBillingError("provider object")).toBe("Billing could not be updated.");
    expect(formatBillingError(new Error("x".repeat(300)))).toHaveLength(240);
  });
});
