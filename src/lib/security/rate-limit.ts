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
