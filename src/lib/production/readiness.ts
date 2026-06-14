export type ReadinessStatus = "ready" | "missing";

export type ReadinessEnv = Record<string, string | undefined> & Partial<Record<
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SECRET_KEY"
  | "WORKFLOW_AUTH_ENCRYPTION_KEY"
  | "SCHEDULER_SECRET"
  | "SUPABASE_CRON_ENABLED"
  | "RESEND_API_KEY"
  | "RESEND_FROM_EMAIL"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "STRIPE_PRICE_ID"
  | "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  | "SENTRY_DSN"
  | "NEXT_PUBLIC_SENTRY_DSN"
  | "NEXT_PUBLIC_POSTHOG_KEY"
  | "NEXT_PUBLIC_POSTHOG_HOST",
  string | undefined
>>;

export type ReadinessItem = {
  label: string;
  configured: boolean;
  env: string;
};

export type ReadinessGroup = {
  id: "app" | "supabase" | "scheduler" | "email" | "billing" | "observability";
  label: string;
  detail: string;
  required: boolean;
  status: ReadinessStatus;
  items: ReadinessItem[];
};

export type ProductionReadiness = {
  launchReady: boolean;
  missingRequired: string[];
  groups: ReadinessGroup[];
};

export type PublicHealthPayload = {
  ok: boolean;
  status: "ready" | "degraded";
  launchReady: boolean;
  generatedAt: string;
  checks: Array<Pick<ReadinessGroup, "id" | "status" | "required">>;
};

export function buildProductionReadiness(env: ReadinessEnv = process.env): ProductionReadiness {
  const groups: ReadinessGroup[] = [
    buildGroup({
      id: "app",
      label: "App runtime",
      detail: "Public app URL and encryption key.",
      env,
      keys: [
        ["NEXT_PUBLIC_APP_URL", "Public app URL"],
        ["WORKFLOW_AUTH_ENCRYPTION_KEY", "Workflow secret encryption"],
      ],
    }),
    buildGroup({
      id: "supabase",
      label: "Supabase",
      detail: "Auth, Postgres, Storage, and server-side jobs.",
      env,
      keys: [
        ["NEXT_PUBLIC_SUPABASE_URL", "Project URL"],
        ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Publishable key"],
        ["SUPABASE_SECRET_KEY", "Server secret key"],
      ],
    }),
    buildSchedulerGroup(env),
    buildGroup({
      id: "email",
      label: "Resend email",
      detail: "High-severity alerts and report sends.",
      env,
      keys: [
        ["RESEND_API_KEY", "API key"],
        ["RESEND_FROM_EMAIL", "From sender"],
      ],
    }),
    buildGroup({
      id: "billing",
      label: "Stripe billing",
      detail: "Checkout, customer portal, and webhook lifecycle.",
      env,
      keys: [
        ["STRIPE_SECRET_KEY", "Secret key"],
        ["STRIPE_WEBHOOK_SECRET", "Webhook signing secret"],
        ["STRIPE_PRICE_ID", "Subscription price"],
        ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Publishable key"],
      ],
    }),
    buildObservabilityGroup(env),
  ];
  const missingRequired = groups
    .flatMap((group) => group.items)
    .filter((item) => !item.configured)
    .map((item) => item.env);

  return {
    launchReady: missingRequired.length === 0,
    missingRequired,
    groups,
  };
}

export function buildPublicHealthPayload(env: ReadinessEnv = process.env): PublicHealthPayload {
  const readiness = buildProductionReadiness(env);

  return {
    ok: true,
    status: readiness.launchReady ? "ready" : "degraded",
    launchReady: readiness.launchReady,
    generatedAt: new Date().toISOString(),
    checks: readiness.groups.map((group) => ({
      id: group.id,
      status: group.status,
      required: group.required,
    })),
  };
}

function buildGroup({
  id,
  label,
  detail,
  env,
  keys,
}: {
  id: ReadinessGroup["id"];
  label: string;
  detail: string;
  env: ReadinessEnv;
  keys: Array<[keyof ReadinessEnv, string]>;
}): ReadinessGroup {
  const items = keys.map(([key, itemLabel]) => ({
    label: itemLabel,
    env: key,
    configured: isConfiguredEnvValue(key, env[key]),
  }));

  return {
    id,
    label,
    detail,
    required: true,
    status: items.every((item) => item.configured) ? "ready" : "missing",
    items,
  };
}

function buildSchedulerGroup(env: ReadinessEnv): ReadinessGroup {
  const items: ReadinessItem[] = [
    {
      label: "Scheduler route secret",
      env: "SCHEDULER_SECRET",
      configured: hasValue(env.SCHEDULER_SECRET),
    },
    {
      label: "Supabase Cron and Vault",
      env: "SUPABASE_CRON_ENABLED",
      configured: hasValue(env.SUPABASE_CRON_ENABLED),
    },
  ];

  return {
    id: "scheduler",
    label: "Scheduled jobs",
    detail: "Supabase Cron triggers the protected due-check sweep.",
    required: true,
    status: items.every((item) => item.configured) ? "ready" : "missing",
    items,
  };
}

function buildObservabilityGroup(env: ReadinessEnv): ReadinessGroup {
  const items: ReadinessItem[] = [
    {
      label: "Sentry DSN",
      env: "SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN",
      configured: hasValue(env.SENTRY_DSN) || hasValue(env.NEXT_PUBLIC_SENTRY_DSN),
    },
    {
      label: "PostHog project key",
      env: "NEXT_PUBLIC_POSTHOG_KEY",
      configured: hasValue(env.NEXT_PUBLIC_POSTHOG_KEY),
    },
    {
      label: "PostHog host",
      env: "NEXT_PUBLIC_POSTHOG_HOST",
      configured: hasValue(env.NEXT_PUBLIC_POSTHOG_HOST),
    },
  ];

  return {
    id: "observability",
    label: "Observability",
    detail: "Error tracking and product analytics.",
    required: true,
    status: items.every((item) => item.configured) ? "ready" : "missing",
    items,
  };
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function isConfiguredEnvValue(key: keyof ReadinessEnv, value: string | undefined): boolean {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return false;
  }

  if (key === "NEXT_PUBLIC_APP_URL") {
    return isAbsoluteHttpUrl(configuredValue);
  }

  return true;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}
