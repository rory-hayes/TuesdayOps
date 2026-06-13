import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const retrieveSubscription = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent,
    },
    subscriptions: {
      retrieve: retrieveSubscription,
    },
  }),
}));

vi.mock("@/lib/env", () => ({
  getStripeWebhookSecret: () => "whsec_test",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

import { POST } from "./route";

describe("Stripe webhook route", () => {
  beforeEach(() => {
    constructEvent.mockReset();
    retrieveSubscription.mockReset();
    fromMock.mockReset();
  });

  it("rejects requests without a Stripe signature before reading secrets or touching the database", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing Stripe signature." });
    expect(constructEvent).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects invalid signatures without recording a billing event", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload.");
    });

    const response = await POST(
      new Request("https://app.example.com/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "invalid" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No signatures found matching the expected signature for payload.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("acknowledges duplicate Stripe events without inserting or mutating billing state", async () => {
    constructEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_duplicate",
          customer: "cus_duplicate",
          status: "active",
          items: { data: [] },
        },
      },
    });

    const existingEventQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_duplicate" }, error: null }),
      insert: vi.fn(),
      update: vi.fn(),
    };
    fromMock.mockReturnValue(existingEventQuery);

    const response = await POST(
      new Request("https://app.example.com/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "valid" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("billing_events");
    expect(existingEventQuery.insert).not.toHaveBeenCalled();
    expect(existingEventQuery.update).not.toHaveBeenCalled();
  });
});
