import { describe, expect, it } from "vitest";
import {
  buildAgencyBillingUpdate,
  getAgencyIdFromCheckoutSession,
  normalizeStripeSubscriptionStatus,
} from "@/lib/billing/webhook";

describe("Stripe webhook helpers", () => {
  it("maps Stripe subscription states into agency billing states", () => {
    expect(normalizeStripeSubscriptionStatus("trialing")).toBe("trialing");
    expect(normalizeStripeSubscriptionStatus("active")).toBe("active");
    expect(normalizeStripeSubscriptionStatus("past_due")).toBe("past_due");
    expect(normalizeStripeSubscriptionStatus("unpaid")).toBe("past_due");
    expect(normalizeStripeSubscriptionStatus("canceled")).toBe("canceled");
    expect(normalizeStripeSubscriptionStatus("incomplete")).toBe("incomplete");
  });

  it("builds a safe agency update from a subscription object", () => {
    const update = buildAgencyBillingUpdate({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      current_period_end: 1_781_000_000,
      items: {
        data: [
          {
            price: {
              id: "price_123",
            },
          },
        ],
      },
    });

    expect(update).toEqual({
      billing_customer_id: "cus_123",
      billing_subscription_id: "sub_123",
      billing_status: "active",
      billing_price_id: "price_123",
      billing_current_period_end: new Date(1_781_000_000 * 1000).toISOString(),
      plan: "growth",
    });
  });

  it("resolves agency id from checkout metadata before client reference id", () => {
    expect(
      getAgencyIdFromCheckoutSession({
        client_reference_id: "agency-fallback",
        metadata: { agency_id: "agency-primary" },
      }),
    ).toBe("agency-primary");

    expect(
      getAgencyIdFromCheckoutSession({
        client_reference_id: "agency-fallback",
        metadata: {},
      }),
    ).toBe("agency-fallback");
  });
});
