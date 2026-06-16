import { NextResponse } from "next/server";
import { getSchedulerSecret } from "@/lib/env";
import { runDueMonthlyReports } from "@/lib/reports/scheduler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized scheduler trigger." }, { status: 401 });
  }

  const result = await runDueMonthlyReports({
    supabase: createAdminClient(),
  });

  return NextResponse.json({ ok: true, ...result });
}

function isAuthorized(request: Request): boolean {
  const secret = getSchedulerSecret();
  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-scheduler-secret");

  return authorization === `Bearer ${secret}` || headerSecret === secret;
}
