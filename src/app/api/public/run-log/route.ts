import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { parseRunLogPayload, recordExternalRunLog, RunLogAuthError } from "@/lib/run-logs/service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const apiKey = getBearerToken(request);

  if (!apiKey) {
    return NextResponse.json({ error: "Run log API key is required." }, { status: 401 });
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
      supabase: createAdminClient(),
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
