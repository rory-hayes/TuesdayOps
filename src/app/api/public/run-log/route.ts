import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { parseRunLogPayload, recordExternalRunLog, RunLogAuthError } from "@/lib/run-logs/service";
import { buildRateLimitHeaders, consumePersistentRateLimit, hashRateLimitIdentifier } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const invalidRunLogBearerCache = new Map<string, number>();
const invalidRunLogBearerCacheTtlMs = 5 * 60 * 1000;
const invalidRunLogBearerCacheMaxEntries = 1_000;

export async function POST(request: Request) {
  const supabase = createAdminClient();
  const clientIdentifier = getClientRateLimitIdentifier(request);
  const unauthenticatedRateLimit = await consumePersistentRateLimit({
    scope: "public-run-log-preauth",
    identifier: clientIdentifier,
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

  const globalUnauthenticatedRateLimit = await consumePersistentRateLimit({
    scope: "public-run-log-preauth",
    identifier: "global",
    limit: 1200,
    windowSeconds: 60,
    supabase,
  });

  if (!globalUnauthenticatedRateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many run log requests." },
      {
        status: 429,
        headers: buildRateLimitHeaders(globalUnauthenticatedRateLimit),
      },
    );
  }

  const apiKey = getBearerToken(request);

  if (!apiKey) {
    return NextResponse.json({ error: "Run log API key is required." }, { status: 401 });
  }

  const tokenFingerprint = getRunLogTokenFingerprint(apiKey);

  if (isCachedInvalidRunLogBearer(tokenFingerprint)) {
    logInvalidRunLogBearer({ clientIdentifier, tokenFingerprint });
    return NextResponse.json({ error: "Run log API key was invalid." }, { status: 401 });
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
      cacheInvalidRunLogBearer(tokenFingerprint);
      logInvalidRunLogBearer({ clientIdentifier, tokenFingerprint });
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

function getRunLogTokenFingerprint(apiKey: string): string {
  return hashRateLimitIdentifier(apiKey).slice(0, 16);
}

function isCachedInvalidRunLogBearer(tokenFingerprint: string): boolean {
  const expiresAt = invalidRunLogBearerCache.get(tokenFingerprint);
  const now = Date.now();

  if (!expiresAt) {
    return false;
  }

  if (expiresAt <= now) {
    invalidRunLogBearerCache.delete(tokenFingerprint);
    return false;
  }

  return true;
}

function cacheInvalidRunLogBearer(tokenFingerprint: string) {
  const now = Date.now();
  invalidRunLogBearerCache.set(tokenFingerprint, now + invalidRunLogBearerCacheTtlMs);

  if (invalidRunLogBearerCache.size <= invalidRunLogBearerCacheMaxEntries) {
    return;
  }

  for (const [fingerprint, expiresAt] of invalidRunLogBearerCache.entries()) {
    if (expiresAt <= now || invalidRunLogBearerCache.size > invalidRunLogBearerCacheMaxEntries) {
      invalidRunLogBearerCache.delete(fingerprint);
    }
  }
}

function logInvalidRunLogBearer({
  clientIdentifier,
  tokenFingerprint,
}: {
  clientIdentifier: string;
  tokenFingerprint: string;
}) {
  console.warn("Invalid public run-log bearer key rejected", {
    client: clientIdentifier,
    tokenFingerprint,
  });
}
