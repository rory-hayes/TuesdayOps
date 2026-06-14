import { describe, expect, it } from "vitest";
import {
  buildProductionReadiness,
  buildPublicHealthPayload,
  type ReadinessEnv,
} from "./readiness";

const completeEnv: ReadinessEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_key",
  SUPABASE_SECRET_KEY: "supabase-secret-service-role",
  WORKFLOW_AUTH_ENCRYPTION_KEY: "32-byte-minimum-encryption-secret",
  SCHEDULER_SECRET: "scheduler-secret",
  SUPABASE_CRON_ENABLED: "true",
  RESEND_API_KEY: "re_secret",
  RESEND_FROM_EMAIL: "alerts@example.com",
  STRIPE_SECRET_KEY: "sk_live_secret",
  STRIPE_WEBHOOK_SECRET: "whsec_secret",
  STRIPE_PRICE_ID: "price_123",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_public",
  SENTRY_DSN: "https://sentry.example/1",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_public",
  NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
  NEXT_PUBLIC_APP_URL: "https://tuesday-ops.vercel.app",
};

describe("buildProductionReadiness", () => {
  it("marks every provider group ready when required production env is configured", () => {
    const readiness = buildProductionReadiness(completeEnv);

    expect(readiness.launchReady).toBe(true);
    expect(readiness.missingRequired).toEqual([]);
    expect(readiness.groups.map((group) => [group.id, group.status])).toEqual([
      ["app", "ready"],
      ["supabase", "ready"],
      ["scheduler", "ready"],
      ["email", "ready"],
      ["billing", "ready"],
      ["observability", "ready"],
    ]);
  });

  it("treats missing provider configuration as launch blocking without leaking values", () => {
    const readiness = buildProductionReadiness({
      ...completeEnv,
      SUPABASE_SECRET_KEY: undefined,
      RESEND_API_KEY: undefined,
      STRIPE_SECRET_KEY: undefined,
      SENTRY_DSN: undefined,
    });

    expect(readiness.launchReady).toBe(false);
    expect(readiness.missingRequired).toEqual([
      "SUPABASE_SECRET_KEY",
      "RESEND_API_KEY",
      "STRIPE_SECRET_KEY",
      "SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN",
    ]);
    expect(JSON.stringify(readiness)).not.toContain("sk_live_secret");
    expect(JSON.stringify(readiness)).not.toContain("supabase-secret-service-role");
  });

  it("keeps scheduler launch blocked until Supabase Cron is marked configured", () => {
    const readiness = buildProductionReadiness({
      ...completeEnv,
      SUPABASE_CRON_ENABLED: undefined,
    });

    const scheduler = readiness.groups.find((group) => group.id === "scheduler");

    expect(scheduler?.status).toBe("missing");
    expect(readiness.launchReady).toBe(false);
    expect(readiness.missingRequired).toContain("SUPABASE_CRON_ENABLED");
  });

  it("marks app runtime missing when the public app URL is malformed", () => {
    const readiness = buildProductionReadiness({
      ...completeEnv,
      NEXT_PUBLIC_APP_URL: "tuesday-ops.vercel.app",
    });

    const app = readiness.groups.find((group) => group.id === "app");

    expect(app?.status).toBe("missing");
    expect(readiness.launchReady).toBe(false);
    expect(readiness.missingRequired).toContain("NEXT_PUBLIC_APP_URL");
  });
});

describe("buildPublicHealthPayload", () => {
  it("returns a compact public payload with no secret material", () => {
    const payload = buildPublicHealthPayload(completeEnv);

    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("ready");
    expect(payload.launchReady).toBe(true);
    expect(payload.checks).toEqual([
      { id: "app", status: "ready", required: true },
      { id: "supabase", status: "ready", required: true },
      { id: "scheduler", status: "ready", required: true },
      { id: "email", status: "ready", required: true },
      { id: "billing", status: "ready", required: true },
      { id: "observability", status: "ready", required: true },
    ]);
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(JSON.stringify(payload)).not.toContain("sk_live");
  });
});
