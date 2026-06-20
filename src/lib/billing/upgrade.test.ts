import { describe, expect, it } from "vitest";
import {
  getNextBillingPlan,
  getPlanLimitUpgradePrompt,
  isPlanLimitUpgradeError,
} from "@/lib/billing/upgrade";

describe("billing upgrade prompts", () => {
  it("detects plan-limit errors without treating ordinary errors as upgrade prompts", () => {
    expect(isPlanLimitUpgradeError("Upgrade to add more clients.")).toBe(true);
    expect(isPlanLimitUpgradeError("Upgrade to monitor more workflows.")).toBe(true);
    expect(isPlanLimitUpgradeError("Client update did not pass validation.")).toBe(false);
    expect(isPlanLimitUpgradeError(undefined)).toBe(false);
  });

  it("recommends the next public paid tier", () => {
    expect(getNextBillingPlan("starter")?.key).toBe("growth");
    expect(getNextBillingPlan("growth")?.key).toBe("scale");
    expect(getNextBillingPlan("scale")?.key).toBe("agency_plus");
    expect(getNextBillingPlan("unknown")?.key).toBe("growth");
  });

  it("builds a client-limit upgrade prompt with current usage and next-plan copy", () => {
    expect(
      getPlanLimitUpgradePrompt({
        error: "Upgrade to add more clients.",
        plan: "starter",
        billingStatus: "active",
        activeClients: 3,
        workflows: 2,
      }),
    ).toMatchObject({
      title: "Plan limit reached",
      usageLabel: "3 / 3 clients",
      recommendedPlanKey: "growth",
      ctaLabel: "Upgrade to Growth",
    });
  });

  it("builds a workflow-limit upgrade prompt with the relevant workflow usage", () => {
    expect(
      getPlanLimitUpgradePrompt({
        error: "Upgrade to monitor more workflows.",
        plan: "growth",
        billingStatus: "active",
        activeClients: 8,
        workflows: 50,
      }),
    ).toMatchObject({
      usageLabel: "50 / 50 workflows",
      recommendedPlanKey: "scale",
      ctaLabel: "Upgrade to Scale",
    });
  });
});
