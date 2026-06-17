import { describe, expect, it } from "vitest";
import {
  canCreateClient,
  canCreateWorkflow,
  formatLimit,
  getPlanLimits,
} from "@/lib/billing/limits";

describe("billing plan limits", () => {
  it("allows starter agencies to create up to three clients", () => {
    expect(
      canCreateClient({
        plan: "starter",
        billingStatus: "trialing",
        activeClients: 2,
      }),
    ).toMatchObject({ allowed: true, limit: 3 });

    expect(
      canCreateClient({
        plan: "starter",
        billingStatus: "trialing",
        activeClients: 3,
      }),
    ).toMatchObject({
      allowed: false,
      limit: 3,
      upgradeMessage: "Upgrade to add more clients.",
    });
  });

  it("enforces workflow creation without treating existing rows as broken data", () => {
    const result = canCreateWorkflow({
      plan: "starter",
      billingStatus: "active",
      workflows: 10,
    });

    expect(result).toMatchObject({
      allowed: false,
      limit: 10,
      current: 10,
    });
  });

  it("enforces the agreed paid plan tiers", () => {
    expect(getPlanLimits("growth", "active")).toEqual({ clients: 10, workflows: 50 });
    expect(getPlanLimits("scale", "active")).toEqual({ clients: 30, workflows: 150 });
    expect(getPlanLimits("agency_plus", "active")).toEqual({
      clients: Number.POSITIVE_INFINITY,
      workflows: Number.POSITIVE_INFINITY,
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
    expect(getPlanLimits("enterprise", "active")).toEqual({ clients: 3, workflows: 10 });
    expect(getPlanLimits("growth", "past_due")).toEqual({ clients: 3, workflows: 10 });
  });

  it("formats finite and unlimited limits for billing UI copy", () => {
    expect(formatLimit(5)).toBe("5");
    expect(formatLimit(Number.POSITIVE_INFINITY)).toBe("Unlimited");
  });
});
