import {
  BILLING_PLAN_KEYS,
  STRIPE_PRICE_ENV_BY_PLAN,
  type BillingPlanKey,
} from "@/lib/billing/plans";

type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

export function getWorkflowAuthEncryptionKey(): string | undefined {
  return process.env.WORKFLOW_AUTH_ENCRYPTION_KEY;
}

export function getSupabaseSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. This key is required for server-side background jobs.");
  }

  return secretKey;
}

export function getSchedulerSecret(): string {
  const schedulerSecret = process.env.SCHEDULER_SECRET;

  if (!schedulerSecret) {
    throw new Error("Missing SCHEDULER_SECRET. This secret is required for protected scheduler triggers.");
  }

  return schedulerSecret;
}

export function getAppUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    toHttpsUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    toHttpsUrl(process.env.VERCEL_URL) ??
    "http://localhost:3000";

  try {
    const parsedUrl = new URL(appUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol.");
    }

    return parsedUrl.origin;
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_APP_URL. Set it to an absolute http(s) URL.");
  }
}

function toHttpsUrl(host: string | undefined): string | undefined {
  const normalizedHost = host?.trim();

  if (!normalizedHost) {
    return undefined;
  }

  return normalizedHost.startsWith("http://") || normalizedHost.startsWith("https://")
    ? normalizedHost
    : `https://${normalizedHost}`;
}

export function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY. This key is required for email alerts.");
  }

  return apiKey;
}

export function getResendFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("Missing RESEND_FROM_EMAIL. This sender is required for email alerts.");
  }

  return fromEmail;
}

export function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY. This key is required for billing.");
  }

  return secretKey;
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET. This secret is required for Stripe webhooks.");
  }

  return webhookSecret;
}

export function getStripePriceId(): string {
  return getStripePriceIdForPlan("growth");
}

export function getStripePriceIdForPlan(plan: BillingPlanKey, env: NodeJS.ProcessEnv = process.env): string {
  const envName = STRIPE_PRICE_ENV_BY_PLAN[plan];
  const priceId = env[envName] ?? (plan === "growth" ? env.STRIPE_PRICE_ID : undefined);

  if (!priceId) {
    throw new Error(`Missing ${envName}. This price is required for ${plan} subscription checkout.`);
  }

  return priceId;
}

export function getStripePriceIdsByPlan(env: NodeJS.ProcessEnv = process.env): Partial<Record<BillingPlanKey, string>> {
  return Object.fromEntries(
    BILLING_PLAN_KEYS
      .map((plan) => [plan, env[STRIPE_PRICE_ENV_BY_PLAN[plan]] ?? (plan === "growth" ? env.STRIPE_PRICE_ID : undefined)] as const)
      .filter((entry): entry is [BillingPlanKey, string] => Boolean(entry[1])),
  );
}

export function getStripePlanForPriceId(
  priceId: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): BillingPlanKey | null {
  if (!priceId) {
    return null;
  }

  const match = Object.entries(getStripePriceIdsByPlan(env)).find(([, configuredPriceId]) => configuredPriceId === priceId);

  return (match?.[0] as BillingPlanKey | undefined) ?? null;
}
