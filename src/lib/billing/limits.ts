export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export type PlanLimits = {
  clients: number;
  workflows: number;
};

export type LimitDecision = {
  allowed: boolean;
  current: number;
  limit: number;
  upgradeMessage?: string;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: { clients: 1, workflows: 3 },
  growth: { clients: 5, workflows: 20 },
  pro: { clients: 15, workflows: 75 },
  design_partner: {
    clients: Number.POSITIVE_INFINITY,
    workflows: Number.POSITIVE_INFINITY,
  },
};

export function getPlanLimits(plan: string, billingStatus: BillingStatus | string): PlanLimits {
  if (plan === "design_partner") {
    return PLAN_LIMITS.design_partner;
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
