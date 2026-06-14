import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "./rate-limit";

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
});
