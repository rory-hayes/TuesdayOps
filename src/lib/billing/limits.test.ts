import { describe, expect, it } from "vitest";
import {
  canCreateClient,
  canCreateWorkflow,
  formatLimit,
  getPlanLimits,
} from "@/lib/billing/limits";

describe("billing plan limits", () => {
  it("allows starter agencies to create the first client and blocks the second", () => {
    expect(
      canCreateClient({
        plan: "starter",
        billingStatus: "trialing",
        activeClients: 0,
      }),
    ).toMatchObject({ allowed: true, limit: 1 });

    expect(
      canCreateClient({
        plan: "starter",
        billingStatus: "trialing",
        activeClients: 1,
      }),
    ).toMatchObject({
      allowed: false,
      limit: 1,
      upgradeMessage: "Upgrade to add more clients.",
    });
  });

  it("enforces workflow creation without treating existing rows as broken data", () => {
    const result = canCreateWorkflow({
      plan: "starter",
      billingStatus: "active",
      workflows: 3,
    });

    expect(result).toMatchObject({
      allowed: false,
      limit: 3,
      current: 3,
    });
  });

  it("keeps design partner workspaces unrestricted for onboarding pilots", () => {
    const limits = getPlanLimits("design_partner", "active");

    expect(limits.clients).toBe(Number.POSITIVE_INFINITY);
    expect(limits.workflows).toBe(Number.POSITIVE_INFINITY);
    expect(
      canCreateClient({
        plan: "design_partner",
        billingStatus: "active",
        activeClients: 99,
      }).allowed,
    ).toBe(true);
  });

  it("falls back to starter limits for unknown or inactive paid plans", () => {
    expect(getPlanLimits("enterprise", "active")).toEqual({ clients: 1, workflows: 3 });
    expect(getPlanLimits("growth", "past_due")).toEqual({ clients: 1, workflows: 3 });
  });

  it("formats finite and unlimited limits for billing UI copy", () => {
    expect(formatLimit(5)).toBe("5");
    expect(formatLimit(Number.POSITIVE_INFINITY)).toBe("Unlimited");
  });
});
