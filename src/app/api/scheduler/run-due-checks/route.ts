import { NextResponse, type NextRequest } from "next/server";
import { runDueScheduledChecks } from "@/lib/checks/scheduled-runner";
import { getSchedulerSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAuthorizedSchedulerRequest(request)) {
    return NextResponse.json({ error: "Unauthorized scheduler trigger." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await runDueScheduledChecks({ supabase });

  return NextResponse.json({ ok: true, ...result });
}

function isAuthorizedSchedulerRequest(request: NextRequest): boolean {
  const configuredSecret = getSchedulerSecret();
  const bearerToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerSecret = request.headers.get("x-scheduler-secret");

  return bearerToken === configuredSecret || headerSecret === configuredSecret;
}
