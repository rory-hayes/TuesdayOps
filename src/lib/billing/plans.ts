export const BILLING_PLAN_KEYS = ["starter", "growth", "scale", "agency_plus"] as const;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];

export type PlanLimits = {
  clients: number;
  workflows: number;
};

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  priceLabel: string;
  cadence: string;
  limits: PlanLimits;
  limitLabel: string;
  purpose: string;
  featured?: boolean;
};

export const PUBLIC_BILLING_PLANS: BillingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    priceLabel: "€99",
    cadence: "/mo",
    limits: { clients: 3, workflows: 10 },
    limitLabel: "3 clients, 10 workflows",
    purpose: "Low-friction entry",
  },
  {
    key: "growth",
    name: "Growth",
    priceLabel: "€199",
    cadence: "/mo",
    limits: { clients: 10, workflows: 50 },
    limitLabel: "10 clients, 50 workflows",
    purpose: "Main plan",
    featured: true,
  },
  {
    key: "scale",
    name: "Scale",
    priceLabel: "€499",
    cadence: "/mo",
    limits: { clients: 30, workflows: 150 },
    limitLabel: "30 clients, 150 workflows",
    purpose: "Serious agencies",
  },
  {
    key: "agency_plus",
    name: "Agency+",
    priceLabel: "Contact sales",
    cadence: "",
    limits: {
      clients: Number.POSITIVE_INFINITY,
      workflows: Number.POSITIVE_INFINITY,
    },
    limitLabel: "Custom limits",
    purpose: "Sales-led setup for larger agencies / MSPs",
  },
];

export const DESIGN_PARTNER_LIMITS: PlanLimits = {
  clients: Number.POSITIVE_INFINITY,
  workflows: Number.POSITIVE_INFINITY,
};

export const STRIPE_PRICE_ENV_BY_PLAN: Record<BillingPlanKey, string> = {
  starter: "STRIPE_PRICE_ID_STARTER",
  growth: "STRIPE_PRICE_ID_GROWTH",
  scale: "STRIPE_PRICE_ID_SCALE",
  agency_plus: "STRIPE_PRICE_ID_AGENCY_PLUS",
};

export function isBillingPlanKey(value: unknown): value is BillingPlanKey {
  return typeof value === "string" && BILLING_PLAN_KEYS.includes(value as BillingPlanKey);
}

export function getBillingPlan(plan: string): BillingPlan | undefined {
  return PUBLIC_BILLING_PLANS.find((candidate) => candidate.key === plan);
}

export function getBillingPlanName(plan: string): string {
  return getBillingPlan(plan)?.name ?? plan;
}
