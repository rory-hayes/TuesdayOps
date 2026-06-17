import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export type MemoryRateLimiter = {
  check: (key: string) => RateLimitDecision;
};

type PersistentRateLimitRow = {
  allowed: boolean;
  limit_count: number;
  remaining: number;
  retry_after_seconds: number;
  reset_at: string;
};

export class RateLimitExceededError extends Error {
  constructor(public readonly decision: RateLimitDecision) {
    super("Too many requests. Try again later.");
    this.name = "RateLimitExceededError";
  }
}

export function createMemoryRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): MemoryRateLimiter {
  const entries = new Map<string, RateLimitEntry>();

  return {
    check(key: string): RateLimitDecision {
      const currentTime = now();
      const existing = entries.get(key);
      const entry = existing && existing.resetAt > currentTime
        ? existing
        : { count: 0, resetAt: currentTime + windowMs };

      if (entry.count >= limit) {
        entries.set(key, entry);
        return buildDecision({ allowed: false, limit, count: entry.count, resetAt: entry.resetAt, now: currentTime });
      }

      entry.count += 1;
      entries.set(key, entry);

      if (entries.size > 1_000) {
        pruneExpiredEntries(entries, currentTime);
      }

      return buildDecision({ allowed: true, limit, count: entry.count, resetAt: entry.resetAt, now: currentTime });
    },
  };
}

export async function consumePersistentRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
  supabase,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
  supabase?: SupabaseClient;
}): Promise<RateLimitDecision> {
  const client = supabase ?? await createDefaultRateLimitClient();
  const bucketKey = buildPersistentRateLimitKey(scope, identifier);
  const { data, error } = await client
    .rpc("consume_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    .single();

  if (error || !data) {
    throw new Error(`Rate limit could not be verified: ${error?.message ?? "No limiter result returned."}`);
  }

  const row = data as PersistentRateLimitRow;

  return {
    allowed: Boolean(row.allowed),
    limit: Number(row.limit_count),
    remaining: Math.max(Number(row.remaining), 0),
    resetAt: new Date(row.reset_at).getTime(),
    retryAfterSeconds: Math.max(Number(row.retry_after_seconds), 0),
  };
}

export async function assertPersistentRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
  supabase?: SupabaseClient;
}): Promise<RateLimitDecision> {
  const decision = await consumePersistentRateLimit(input);

  if (!decision.allowed) {
    throw new RateLimitExceededError(decision);
  }

  return decision;
}

export function buildPersistentRateLimitKey(scope: string, identifier: string): string {
  const normalizedScope = scope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "rate_limit";

  return `${normalizedScope}:${hashRateLimitIdentifier(identifier)}`;
}

export function buildRateLimitHeaders(decision: RateLimitDecision): HeadersInit {
  return {
    "Retry-After": String(decision.retryAfterSeconds),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
  };
}

export function hashRateLimitIdentifier(identifier: string): string {
  return createHash("sha256")
    .update(identifier)
    .digest("hex");
}

function buildDecision({
  allowed,
  limit,
  count,
  resetAt,
  now,
}: {
  allowed: boolean;
  limit: number;
  count: number;
  resetAt: number;
  now: number;
}): RateLimitDecision {
  return {
    allowed,
    limit,
    remaining: Math.max(limit - count, 0),
    resetAt,
    retryAfterSeconds: Math.max(Math.ceil((resetAt - now) / 1000), 0),
  };
}

function pruneExpiredEntries(entries: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of entries.entries()) {
    if (entry.resetAt <= now) {
      entries.delete(key);
    }
  }
}

async function createDefaultRateLimitClient(): Promise<SupabaseClient> {
  const { createAdminClient } = await import("@/lib/supabase/admin");

  return createAdminClient();
}
