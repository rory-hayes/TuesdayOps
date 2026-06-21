import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCheckoutSessionAction,
  requestAgencyPlusContactAction,
} from "@/lib/billing/service";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  requireWorkspace: vi.fn(),
  getStripeClient: vi.fn(),
  assertPersistentRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/workspace", () => ({
  requireWorkspace: mocks.requireWorkspace,
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: mocks.getStripeClient,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertPersistentRateLimit: mocks.assertPersistentRateLimit,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/audit/events", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

const workspace = {
  role: "owner",
  user: {
    id: "user-1",
    email: "owner@example.com",
  },
  agency: {
    id: "agency-1",
    name: "Agency",
    slug: "agency",
    plan: "starter",
    billingStatus: "active",
  },
};

describe("billing server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspace.mockResolvedValue(workspace);
    mocks.createAdminClient.mockReturnValue({ from: vi.fn() });
    mocks.recordAuditEvent.mockResolvedValue(undefined);
  });

  it("blocks Agency+ checkout before touching Stripe", async () => {
    await expectRedirect(
      createCheckoutSessionAction(formData({ plan: "agency_plus" })),
      "/settings?billing_error=Agency%2B%20is%20configured%20by%20sales.%20Submit%20the%20contact%20form%20and%20we%20will%20follow%20up.",
    );

    expect(mocks.assertPersistentRateLimit).not.toHaveBeenCalled();
    expect(mocks.getStripeClient).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("records Agency+ contact requests for operator follow-up", async () => {
    await expectRedirect(
      requestAgencyPlusContactAction(formData({
        contactName: "Rory Hayes",
        contactEmail: "rory@example.com",
        contactPhone: "+353 1 555 0100",
        role: "Founder",
        expectedClients: "45",
        expectedWorkflows: "220",
        timeline: "This month",
        requirements: "Need onboarding support, custom billing, and account configuration.",
      })),
      "/settings?billing=agency-plus-contact-requested",
    );

    expect(mocks.assertPersistentRateLimit).toHaveBeenCalledWith({
      scope: "agency-plus-contact-sales",
      identifier: "agency-1:user-1",
      limit: 3,
      windowSeconds: 3600,
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        actorUserId: "user-1",
        action: "billing.sales_contact_requested",
        targetType: "billing_event",
        targetId: "agency-1",
        metadata: expect.objectContaining({
          plan: "agency_plus",
          contactEmail: "rory@example.com",
          expectedClients: 45,
          expectedWorkflows: 220,
        }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });
});

function formData(values: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

async function expectRedirect(promise: Promise<void>, url: string) {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${url}`);
  expect(mocks.redirect).toHaveBeenCalledWith(url);
}
