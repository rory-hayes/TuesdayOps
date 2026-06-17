import {
  DESIGN_PARTNER_LIMITS,
  PUBLIC_BILLING_PLANS,
  type PlanLimits,
} from "@/lib/billing/plans";

export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export type { PlanLimits };

export type LimitDecision = {
  allowed: boolean;
  current: number;
  limit: number;
  upgradeMessage?: string;
};

const PLAN_LIMITS: Record<string, PlanLimits> = Object.fromEntries(
  PUBLIC_BILLING_PLANS.map((plan) => [plan.key, plan.limits]),
);

export function getPlanLimits(plan: string, billingStatus: BillingStatus | string): PlanLimits {
  if (plan === "design_partner") {
    return DESIGN_PARTNER_LIMITS;
  }

  if (!["trialing", "active"].includes(billingStatus)) {
    return PLAN_LIMITS.starter;
  }

  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

export function canCreateClient(input: {
  plan: string;
  billingStatus: BillingStatus | string;
  activeClients: number;
}): LimitDecision {
  const limit = getPlanLimits(input.plan, input.billingStatus).clients;

  return createDecision({
    current: input.activeClients,
    limit,
    upgradeMessage: "Upgrade to add more clients.",
  });
}

export function canCreateWorkflow(input: {
  plan: string;
  billingStatus: BillingStatus | string;
  workflows: number;
}): LimitDecision {
  const limit = getPlanLimits(input.plan, input.billingStatus).workflows;

  return createDecision({
    current: input.workflows,
    limit,
    upgradeMessage: "Upgrade to monitor more workflows.",
  });
}

export function formatLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}

function createDecision({
  current,
  limit,
  upgradeMessage,
}: {
  current: number;
  limit: number;
  upgradeMessage: string;
}): LimitDecision {
  if (current < limit) {
    return { allowed: true, current, limit };
  }

  return {
    allowed: false,
    current,
    limit,
    upgradeMessage,
  };
}
