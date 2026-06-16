import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/sign-in?error=${encodeURIComponent("The sign-in link was invalid or expired.")}`,
      requestUrl.origin,
    ),
  );
}

function safeNextPath(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/";
}
