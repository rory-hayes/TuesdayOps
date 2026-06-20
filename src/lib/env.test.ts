import { afterEach, describe, expect, it } from "vitest";
import {
  getAppUrl,
  getPublicSupabaseEnv,
  getResendApiKey,
  getResendFromEmail,
  getStripePlanForPriceId,
  getSchedulerSecret,
  getStripePriceId,
  getStripePriceIdForPlan,
  getStripePriceIdsByPlan,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getSupabaseSecretKey,
  getWorkflowAuthEncryptionKey,
} from "./env";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalEnv = { ...process.env };

describe("getAppUrl", () => {
  afterEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_APP_URL: originalAppUrl };
  });

  it("falls back to localhost when no app URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("falls back to the Vercel production URL when no app URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tuesday-ops.vercel.app";
    process.env.VERCEL_URL = "tuesday-preview.vercel.app";

    expect(getAppUrl()).toBe("https://tuesday-ops.vercel.app");
  });

  it("falls back to the Vercel deployment URL when no production URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "tuesday-preview.vercel.app";

    expect(getAppUrl()).toBe("https://tuesday-preview.vercel.app");
  });

  it("requires an absolute http URL when app URL is configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "tuesday-ops.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tuesday-ops.vercel.app";

    expect(() => getAppUrl()).toThrow("Invalid NEXT_PUBLIC_APP_URL");
  });

  it("normalizes configured app URLs to origin and rejects non-http protocols", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tuesday-ops.example.com/settings?billing=ok";
    expect(getAppUrl()).toBe("https://tuesday-ops.example.com");

    process.env.NEXT_PUBLIC_APP_URL = "ftp://example.com";
    expect(() => getAppUrl()).toThrow("Invalid NEXT_PUBLIC_APP_URL");
  });
});

describe("required provider environment helpers", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads public Supabase env and optional workflow encryption key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.WORKFLOW_AUTH_ENCRYPTION_KEY = "encryption-key";

    expect(getPublicSupabaseEnv()).toEqual({
      url: "https://supabase.example.com",
      publishableKey: "publishable",
    });
    expect(getWorkflowAuthEncryptionKey()).toBe("encryption-key");
  });

  it("throws clear setup errors for missing required secrets", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SCHEDULER_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_ID;
    delete process.env.STRIPE_PRICE_ID_STARTER;
    delete process.env.STRIPE_PRICE_ID_GROWTH;
    delete process.env.STRIPE_PRICE_ID_SCALE;
    delete process.env.STRIPE_PRICE_ID_AGENCY_PLUS;

    expect(() => getPublicSupabaseEnv()).toThrow("Missing Supabase environment");
    expect(() => getSupabaseSecretKey()).toThrow("Missing SUPABASE_SECRET_KEY");
    expect(() => getSchedulerSecret()).toThrow("Missing SCHEDULER_SECRET");
    expect(() => getResendApiKey()).toThrow("Missing RESEND_API_KEY");
    expect(() => getResendFromEmail()).toThrow("Missing RESEND_FROM_EMAIL");
    expect(() => getStripeSecretKey()).toThrow("Missing STRIPE_SECRET_KEY");
    expect(() => getStripeWebhookSecret()).toThrow("Missing STRIPE_WEBHOOK_SECRET");
    expect(() => getStripePriceId()).toThrow("Missing STRIPE_PRICE_ID_GROWTH");
  });

  it("returns configured server-only provider values", () => {
    process.env.SUPABASE_SECRET_KEY = "service-role";
    process.env.SCHEDULER_SECRET = "scheduler-secret";
    process.env.RESEND_API_KEY = "resend";
    process.env.RESEND_FROM_EMAIL = "alerts@example.com";
    process.env.STRIPE_SECRET_KEY = "stripe-secret";
    process.env.STRIPE_WEBHOOK_SECRET = "stripe-webhook";
    process.env.STRIPE_PRICE_ID_STARTER = "price_starter";
    process.env.STRIPE_PRICE_ID_GROWTH = "price_growth";
    process.env.STRIPE_PRICE_ID_SCALE = "price_scale";
    process.env.STRIPE_PRICE_ID_AGENCY_PLUS = "price_agency_plus";

    expect(getSupabaseSecretKey()).toBe("service-role");
    expect(getSchedulerSecret()).toBe("scheduler-secret");
    expect(getResendApiKey()).toBe("resend");
    expect(getResendFromEmail()).toBe("alerts@example.com");
    expect(getStripeSecretKey()).toBe("stripe-secret");
    expect(getStripeWebhookSecret()).toBe("stripe-webhook");
    expect(getStripePriceId()).toBe("price_growth");
    expect(getStripePriceIdForPlan("starter")).toBe("price_starter");
    expect(getStripePriceIdForPlan("scale")).toBe("price_scale");
    expect(getStripePriceIdForPlan("agency_plus")).toBe("price_agency_plus");
    expect(getStripePriceIdsByPlan()).toEqual({
      starter: "price_starter",
      growth: "price_growth",
      scale: "price_scale",
      agency_plus: "price_agency_plus",
    });
    expect(getStripePlanForPriceId("price_scale")).toBe("scale");
    expect(getStripePlanForPriceId("price_unknown")).toBeNull();
  });

  it("keeps the legacy single Stripe price ID as a Growth fallback", () => {
    process.env.STRIPE_PRICE_ID = "price_legacy_growth";
    delete process.env.STRIPE_PRICE_ID_GROWTH;

    expect(getStripePriceId()).toBe("price_legacy_growth");
    expect(getStripePriceIdForPlan("growth")).toBe("price_legacy_growth");
    expect(getStripePlanForPriceId("price_legacy_growth")).toBe("growth");
  });
});
