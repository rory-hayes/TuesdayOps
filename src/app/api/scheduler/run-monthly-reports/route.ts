import { NextResponse } from "next/server";
import { getSchedulerSecret } from "@/lib/env";
import { runDueMonthlyReports } from "@/lib/reports/scheduler";
import { buildRateLimitHeaders, consumePersistentRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized scheduler trigger." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const rateLimit = await consumePersistentRateLimit({
    scope: "scheduler-run-monthly-reports",
    identifier: "global",
    limit: 10,
    windowSeconds: 60,
    supabase,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many scheduler trigger attempts." },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimit),
      },
    );
  }

  const result = await runDueMonthlyReports({
    supabase,
  });

  return NextResponse.json({ ok: true, ...result });
}

function isAuthorized(request: Request): boolean {
  const secret = getSchedulerSecret();
  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-scheduler-secret");

  return authorization === `Bearer ${secret}` || headerSecret === secret;
}
