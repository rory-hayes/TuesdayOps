import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertPersistentRateLimit,
  consumePersistentRateLimit,
  type RateLimitDecision,
} from "@/lib/security/rate-limit";

const checkRateLimitWindowSeconds = 600;

export async function assertManualCheckRunRateLimit({
  agencyId,
  userId,
  supabase,
}: {
  agencyId: string;
  userId: string;
  supabase?: SupabaseClient;
}): Promise<void> {
  await assertPersistentRateLimit({
    scope: "manual-check-run-agency",
    identifier: agencyId,
    limit: 100,
    windowSeconds: checkRateLimitWindowSeconds,
    supabase,
  });
  await assertPersistentRateLimit({
    scope: "manual-check-run-user",
    identifier: `${agencyId}:${userId}`,
    limit: 20,
    windowSeconds: checkRateLimitWindowSeconds,
    supabase,
  });
}

export function consumeScheduledCheckRunRateLimit({
  agencyId,
  supabase,
}: {
  agencyId: string;
  supabase: SupabaseClient;
}): Promise<RateLimitDecision> {
  return consumePersistentRateLimit({
    scope: "scheduled-check-run-agency",
    identifier: agencyId,
    limit: 300,
    windowSeconds: checkRateLimitWindowSeconds,
    supabase,
  });
}
