import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { parseRunLogPayload, recordExternalRunLog, RunLogAuthError } from "@/lib/run-logs/service";
import { buildRateLimitHeaders, consumePersistentRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createAdminClient();
  const unauthenticatedRateLimit = await consumePersistentRateLimit({
    scope: "public-run-log-preauth",
    identifier: getClientRateLimitIdentifier(request),
    limit: 240,
    windowSeconds: 60,
    supabase,
  });

  if (!unauthenticatedRateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many run log requests." },
      {
        status: 429,
        headers: buildRateLimitHeaders(unauthenticatedRateLimit),
      },
    );
  }

  const apiKey = getBearerToken(request);

  if (!apiKey) {
    return NextResponse.json({ error: "Run log API key is required." }, { status: 401 });
  }

  const rateLimit = await consumePersistentRateLimit({
    scope: "public-run-log",
    identifier: apiKey,
    limit: 120,
    windowSeconds: 60,
    supabase,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many run log requests." },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimit),
      },
    );
  }

  let payload;

  try {
    payload = parseRunLogPayload(await request.json());
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "Run log payload was invalid." }, { status: 400 });
    }

    throw error;
  }

  try {
    const result = await recordExternalRunLog({
      supabase,
      apiKey,
      payload,
    });

    return NextResponse.json({
      ok: true,
      checkRunId: result.checkRunId,
      status: result.status,
      issueCreated: result.issueCreated,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof RunLogAuthError) {
      return NextResponse.json({ error: "Run log API key was invalid." }, { status: 401 });
    }

    return NextResponse.json({ error: "Run log could not be recorded." }, { status: 500 });
  }
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function getClientRateLimitIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return firstForwardedIp || realIp || "anonymous-public-run-log";
}
