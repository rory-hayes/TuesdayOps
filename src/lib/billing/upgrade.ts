import { formatLimit, getPlanLimits } from "@/lib/billing/limits";
import {
  getBillingPlanName,
  PUBLIC_BILLING_PLANS,
  type BillingPlan,
  type BillingPlanKey,
} from "@/lib/billing/plans";

type PlanLimitKind = "clients" | "workflows";

export type PlanLimitUpgradePrompt = {
  title: string;
  description: string;
  usageLabel: string;
  recommendedPlanKey: BillingPlanKey;
  recommendedPlanName: string;
  recommendedPlanLimitLabel: string;
  ctaLabel: string;
};

const planOrder: BillingPlanKey[] = ["starter", "growth", "scale", "agency_plus"];

export function isPlanLimitUpgradeError(error: string | undefined): boolean {
  return Boolean(getPlanLimitKind(error));
}

export function getNextBillingPlan(plan: string): BillingPlan | undefined {
  const index = planOrder.findIndex((candidate) => candidate === plan);
  const nextKey = index >= 0 ? planOrder[index + 1] : "growth";

  return PUBLIC_BILLING_PLANS.find((candidate) => candidate.key === nextKey);
}

export function getPlanLimitUpgradePrompt({
  error,
  plan,
  billingStatus,
  activeClients,
  workflows,
}: {
  error?: string;
  plan: string;
  billingStatus: string;
  activeClients: number;
  workflows: number;
}): PlanLimitUpgradePrompt | undefined {
  const kind = getPlanLimitKind(error);
  const recommendedPlan = getNextBillingPlan(plan);

  if (!kind || !recommendedPlan) {
    return undefined;
  }

  const limits = getPlanLimits(plan, billingStatus);
  const current = kind === "clients" ? activeClients : workflows;
  const limit = kind === "clients" ? limits.clients : limits.workflows;
  const resourceLabel = kind === "clients" ? "clients" : "workflows";
  const currentPlanName = getBillingPlanName(plan);

  return {
    title: "Plan limit reached",
    description: `You have used all ${resourceLabel} included on ${currentPlanName}. ${recommendedPlan.name} raises the workspace to ${recommendedPlan.limitLabel}.`,
    usageLabel: `${current} / ${formatLimit(limit)} ${resourceLabel}`,
    recommendedPlanKey: recommendedPlan.key,
    recommendedPlanName: recommendedPlan.name,
    recommendedPlanLimitLabel: recommendedPlan.limitLabel,
    ctaLabel: `Upgrade to ${recommendedPlan.name}`,
  };
}

function getPlanLimitKind(error: string | undefined): PlanLimitKind | undefined {
  const normalized = error?.toLowerCase() ?? "";

  if (normalized.includes("upgrade to add more clients")) {
    return "clients";
  }

  if (normalized.includes("upgrade to monitor more workflows")) {
    return "workflows";
  }

  return undefined;
}
