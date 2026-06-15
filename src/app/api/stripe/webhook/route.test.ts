import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordAuditEventSafely } from "@/lib/audit/events";

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

vi.mock("@/lib/audit/events", () => ({
  recordAuditEventSafely: vi.fn(),
}));

import { POST } from "./route";

describe("Stripe webhook route", () => {
  beforeEach(() => {
    constructEvent.mockReset();
    retrieveSubscription.mockReset();
    fromMock.mockReset();
    vi.mocked(recordAuditEventSafely).mockReset();
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

  it("returns a generic verification error when Stripe throws a non-Error value", async () => {
    constructEvent.mockImplementation(() => {
      throw Object.assign(Object.create(null), { message: "invalid" });
    });

    const response = await POST(
      new Request("https://app.example.com/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "invalid" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Stripe webhook verification failed." });
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

  it("returns a database error when duplicate detection cannot be completed", async () => {
    constructEvent.mockReturnValue(buildEvent("evt_lookup_error", "customer.created", {}));
    mockWebhookSupabase({
      existingEventResponse: { data: null, error: { message: "billing event lookup failed" } },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "billing event lookup failed" });
  });

  it("records unhandled Stripe events without mutating agency billing state", async () => {
    constructEvent.mockReturnValue(buildEvent("evt_unhandled", "customer.created", { id: "cus_1" }));
    const state = mockWebhookSupabase();

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.billingEventInserts).toEqual([
      {
        id: "evt_unhandled",
        agency_id: null,
        type: "customer.created",
      },
    ]);
    expect(state.agencyUpdates).toEqual([]);
    expect(recordAuditEventSafely).not.toHaveBeenCalled();
  });

  it("updates agency customer and subscription state for completed checkout sessions", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_checkout", "checkout.session.completed", {
        metadata: { agency_id: "agency-1" },
        customer: "cus_1",
        subscription: "sub_1",
      }),
    );
    retrieveSubscription.mockResolvedValue({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      current_period_end: 1_800_000_000,
      items: { data: [{ price: { id: "price_growth" } }] },
    });
    const state = mockWebhookSupabase({
      agencyBySubscriptionResponse: { data: null, error: null },
      agencyByCustomerResponse: { data: { id: "agency-1" }, error: null },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(retrieveSubscription).toHaveBeenCalledWith("sub_1");
    expect(state.agencyUpdates).toEqual([
      {
        payload: { billing_customer_id: "cus_1" },
        eq: ["id", "agency-1"],
      },
      {
        payload: expect.objectContaining({
          billing_customer_id: "cus_1",
          billing_subscription_id: "sub_1",
          billing_status: "active",
          billing_price_id: "price_growth",
          plan: "growth",
        }),
        eq: ["id", "agency-1"],
      },
    ]);
    expect(state.billingEventInserts).toEqual([
      {
        id: "evt_checkout",
        agency_id: "agency-1",
        type: "checkout.session.completed",
      },
    ]);
    expect(recordAuditEventSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        action: "billing.webhook_processed",
        targetId: "evt_checkout",
      }),
    );
  });

  it("records checkout sessions without agency metadata without touching agencies", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_checkout_no_agency", "checkout.session.completed", {
        customer: { id: "cus_object" },
      }),
    );
    const state = mockWebhookSupabase();

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(retrieveSubscription).not.toHaveBeenCalled();
    expect(state.agencyUpdates).toEqual([]);
    expect(state.billingEventInserts).toEqual([
      {
        id: "evt_checkout_no_agency",
        agency_id: null,
        type: "checkout.session.completed",
      },
    ]);
  });

  it("updates agency customer ids from object-shaped checkout customers without a subscription", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_checkout_customer_object", "checkout.session.completed", {
        client_reference_id: "agency-1",
        customer: { id: "cus_object" },
      }),
    );
    const state = mockWebhookSupabase();

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(retrieveSubscription).not.toHaveBeenCalled();
    expect(state.agencyUpdates).toEqual([
      {
        payload: { billing_customer_id: "cus_object" },
        eq: ["id", "agency-1"],
      },
    ]);
  });

  it("updates agencies matched by subscription id for subscription lifecycle events", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_sub_updated", "customer.subscription.updated", {
        id: "sub_1",
        customer: { id: "cus_1" },
        status: "past_due",
        current_period_end: null,
        items: { data: [{ price: { id: "price_growth" } }] },
      }),
    );
    const state = mockWebhookSupabase({
      agencyBySubscriptionResponse: { data: { id: "agency-1" }, error: null },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.agencyUpdates).toEqual([
      {
        payload: expect.objectContaining({
          billing_customer_id: "cus_1",
          billing_subscription_id: "sub_1",
          billing_status: "past_due",
          billing_price_id: "price_growth",
          billing_current_period_end: null,
          plan: "growth",
        }),
        eq: ["id", "agency-1"],
      },
    ]);
    expect(state.billingEventInserts[0]).toMatchObject({
      id: "evt_sub_updated",
      agency_id: "agency-1",
      type: "customer.subscription.updated",
    });
  });

  it("records subscription events without an agency when no customer match exists", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_sub_orphaned", "customer.subscription.deleted", {
        id: "sub_missing",
        customer: null,
        status: "canceled",
        items: { data: [] },
      }),
    );
    const state = mockWebhookSupabase({
      agencyBySubscriptionResponse: { data: null, error: null },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.billingEventInserts).toEqual([
      {
        id: "evt_sub_orphaned",
        agency_id: null,
        type: "customer.subscription.deleted",
      },
    ]);
    expect(recordAuditEventSafely).not.toHaveBeenCalled();
  });

  it("returns a processing error when customer agency lookup fails", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_sub_customer_error", "customer.subscription.created", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [] },
      }),
    );
    mockWebhookSupabase({
      agencyBySubscriptionResponse: { data: null, error: null },
      agencyByCustomerResponse: { data: null, error: { message: "customer lookup failed" } },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Stripe webhook processing failed." });
  });

  it("records subscription events without an agency when the customer is unmatched", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_sub_unmatched_customer", "customer.subscription.created", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [] },
      }),
    );
    const state = mockWebhookSupabase({
      agencyBySubscriptionResponse: { data: null, error: null },
      agencyByCustomerResponse: { data: null, error: null },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.agencyUpdates).toEqual([]);
    expect(state.billingEventInserts).toContainEqual({
      id: "evt_sub_unmatched_customer",
      agency_id: null,
      type: "customer.subscription.created",
    });
  });

  it("returns a processing error when subscription agency updates fail", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_sub_update_error", "customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [] },
      }),
    );
    const state = mockWebhookSupabase({
      agencyBySubscriptionResponse: { data: { id: "agency-1" }, error: null },
      updateResponses: [{ error: { message: "subscription update denied" } }],
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Stripe webhook processing failed." });
    expect(state.billingEventInserts).toEqual([]);
  });

  it("returns processing errors before recording the billing event", async () => {
    constructEvent.mockReturnValue(
      buildEvent("evt_checkout_error", "checkout.session.completed", {
        client_reference_id: "agency-1",
        customer: "cus_1",
      }),
    );
    const state = mockWebhookSupabase({
      updateResponses: [{ error: { message: "agency update denied" } }],
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Stripe webhook processing failed." });
    expect(state.billingEventInserts).toEqual([]);
  });

  it("returns an error when the billing event cannot be recorded", async () => {
    constructEvent.mockReturnValue(buildEvent("evt_insert_error", "customer.created", { id: "cus_1" }));
    mockWebhookSupabase({
      billingInsertResponse: { error: { message: "billing insert denied" } },
    });

    const response = await postStripeWebhook();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "billing insert denied" });
  });
});

function buildEvent(id: string, type: string, object: unknown) {
  return {
    id,
    type,
    data: { object },
  };
}

async function postStripeWebhook() {
  return POST(
    new Request("https://app.example.com/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "valid" },
    }),
  );
}

function mockWebhookSupabase({
  existingEventResponse = { data: null, error: null },
  billingInsertResponse = { error: null },
  agencyBySubscriptionResponse = { data: null, error: null },
  agencyByCustomerResponse = { data: null, error: null },
  updateResponses = [],
}: {
  existingEventResponse?: { data: { id: string } | null; error: { message: string } | null };
  billingInsertResponse?: { error: { message: string } | null };
  agencyBySubscriptionResponse?: { data: { id: string } | null; error: { message: string } | null };
  agencyByCustomerResponse?: { data: { id: string } | null; error: { message: string } | null };
  updateResponses?: Array<{ error: { message: string } | null }>;
} = {}) {
  const billingEventInserts: unknown[] = [];
  const agencyUpdates: Array<{ payload: unknown; eq: [string, string] }> = [];
  const updateQueue = [...updateResponses];

  fromMock.mockImplementation((table: string) => {
    if (table === "billing_events") {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: vi.fn().mockResolvedValue(existingEventResponse),
        insert(payload: unknown) {
          billingEventInserts.push(payload);
          return Promise.resolve(billingInsertResponse);
        },
      };
    }

    if (table === "agencies") {
      return {
        select() {
          return {
            eq(field: string) {
              return {
                maybeSingle: vi.fn().mockResolvedValue(
                  field === "billing_subscription_id"
                    ? agencyBySubscriptionResponse
                    : agencyByCustomerResponse,
                ),
              };
            },
          };
        },
        update(payload: unknown) {
          return {
            eq(field: string, value: string) {
              agencyUpdates.push({ payload, eq: [field, value] });
              return Promise.resolve(updateQueue.shift() ?? { error: null });
            },
          };
        },
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { billingEventInserts, agencyUpdates };
}
