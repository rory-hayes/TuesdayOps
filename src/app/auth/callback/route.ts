import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error");

  if (providerError) {
    return redirectToSignIn(requestUrl, "Google sign-in could not be completed. Try again.");
  }

  if (!code) {
    return redirectToSignIn(requestUrl, "Google sign-in could not be completed. Try again.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return redirectToSignIn(requestUrl, "Google sign-in could not be completed. Try again.");
}

function redirectToSignIn(requestUrl: URL, message: string) {
  return NextResponse.redirect(
    new URL(
      `/sign-in?error=${encodeURIComponent(message)}`,
      requestUrl.origin,
    ),
  );
}

function safeNextPath(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return value;
  }

  return "/";
}
