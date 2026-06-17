import { describe, expect, it, vi } from "vitest";
import {
  buildPersistentRateLimitKey,
  buildRateLimitHeaders,
  consumePersistentRateLimit,
  createMemoryRateLimiter,
  hashRateLimitIdentifier,
  RateLimitExceededError,
  assertPersistentRateLimit,
} from "./rate-limit";

describe("createMemoryRateLimiter", () => {
  it("allows requests until the fixed window limit is reached", () => {
    const limiter = createMemoryRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: () => 1_000,
    });

    expect(limiter.check("scheduler:127.0.0.1")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.check("scheduler:127.0.0.1")).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.check("scheduler:127.0.0.1")).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    });
  });

  it("resets counters after the window expires", () => {
    let now = 1_000;
    const limiter = createMemoryRateLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => now,
    });

    expect(limiter.check("health:client")).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.check("health:client")).toMatchObject({ allowed: false, retryAfterSeconds: 1 });

    now = 2_001;

    expect(limiter.check("health:client")).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("prunes expired entries once the limiter map grows large", () => {
    let now = 1_000;
    const limiter = createMemoryRateLimiter({
      limit: 1,
      windowMs: 500,
      now: () => now,
    });

    for (let index = 0; index < 1_001; index += 1) {
      limiter.check(`key:${index}`);
    }

    now = 2_000;

    expect(limiter.check("fresh")).toMatchObject({
      allowed: true,
      retryAfterSeconds: 1,
    });
    expect(limiter.check("key:0")).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });
});

describe("persistent rate limiting", () => {
  it("hashes identifiers before building persistent bucket keys", () => {
    const key = buildPersistentRateLimitKey("Public Run Log", "tops_secret_api_key");

    expect(key).toMatch(/^public_run_log:[a-f0-9]{64}$/);
    expect(key).not.toContain("tops_secret_api_key");
    expect(hashRateLimitIdentifier("same")).toBe(hashRateLimitIdentifier("same"));
  });

  it("normalizes Supabase RPC limiter decisions", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        allowed: true,
        limit_count: 5,
        remaining: 4,
        retry_after_seconds: 60,
        reset_at: "2026-06-17T19:30:00.000Z",
      },
      error: null,
    });
    const rpc = vi.fn(() => ({ single }));

    await expect(
      consumePersistentRateLimit({
        scope: "checkout",
        identifier: "user@example.com",
        limit: 5,
        windowSeconds: 600,
        supabase: { rpc } as never,
      }),
    ).resolves.toMatchObject({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfterSeconds: 60,
      resetAt: new Date("2026-06-17T19:30:00.000Z").getTime(),
    });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_bucket_key: buildPersistentRateLimitKey("checkout", "user@example.com"),
      p_limit: 5,
      p_window_seconds: 600,
    });
  });

  it("throws a typed error for blocked persistent limiter decisions", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        allowed: false,
        limit_count: 2,
        remaining: 0,
        retry_after_seconds: 30,
        reset_at: "2026-06-17T19:30:00.000Z",
      },
      error: null,
    });

    await expect(
      assertPersistentRateLimit({
        scope: "report-send",
        identifier: "agency-1",
        limit: 2,
        windowSeconds: 60,
        supabase: { rpc: vi.fn(() => ({ single })) } as never,
      }),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("builds standard rate limit headers", () => {
    expect(
      buildRateLimitHeaders({
        allowed: false,
        limit: 10,
        remaining: 0,
        resetAt: Date.now(),
        retryAfterSeconds: 42,
      }),
    ).toEqual({
      "Retry-After": "42",
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "0",
    });
  });
});
