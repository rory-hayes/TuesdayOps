import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runDueScheduledChecks } from "@/lib/checks/scheduled-runner";
import { getSchedulerSecret } from "@/lib/env";
import { buildRateLimitHeaders, consumePersistentRateLimit, createMemoryRateLimiter } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const schedulerRequestSchema = z.object({
  checkId: z.string().uuid().optional(),
});
const schedulerRateLimiter = createMemoryRateLimiter({ limit: 30, windowMs: 60_000 });
const scheduledCheckBatchLimit = 4;
const scheduledCheckMaxPages = 1;

export async function POST(request: NextRequest) {
  const rateLimit = schedulerRateLimiter.check(`scheduler:${getRequestIp(request)}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many scheduler trigger attempts." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  }

  if (!isAuthorizedSchedulerRequest(request)) {
    return NextResponse.json({ error: "Unauthorized scheduler trigger." }, { status: 401 });
  }

  const parsedBody = await parseSchedulerRequestBody(request);

  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const supabase = createAdminClient();
  const persistentRateLimit = await consumePersistentRateLimit({
    scope: "scheduler-run-due-checks",
    identifier: "global",
    limit: 30,
    windowSeconds: 60,
    supabase,
  });

  if (!persistentRateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many scheduler trigger attempts." },
      {
        status: 429,
        headers: buildRateLimitHeaders(persistentRateLimit),
      },
    );
  }

  const result = await runDueScheduledChecks({
    supabase,
    checkId: parsedBody.data.checkId,
    limit: parsedBody.data.checkId ? 1 : scheduledCheckBatchLimit,
    maxPages: scheduledCheckMaxPages,
  });

  return NextResponse.json({ ok: true, ...result });
}

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function isAuthorizedSchedulerRequest(request: NextRequest): boolean {
  const configuredSecret = getSchedulerSecret();
  const bearerToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerSecret = request.headers.get("x-scheduler-secret");

  return bearerToken === configuredSecret || headerSecret === configuredSecret;
}

async function parseSchedulerRequestBody(
  request: NextRequest,
): Promise<
  | { success: true; data: z.infer<typeof schedulerRequestSchema> }
  | { success: false; error: string }
> {
  const body = await request.text();

  if (!body.trim()) {
    return { success: true, data: {} };
  }

  try {
    const parsed = schedulerRequestSchema.safeParse(JSON.parse(body));

    if (!parsed.success) {
      return { success: false, error: "Scheduler request body was invalid." };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "Scheduler request body must be valid JSON." };
  }
}
