import { NextResponse, type NextRequest } from "next/server";
import { formatOAuthCallbackError } from "@/lib/auth/feedback";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const source = readOAuthSource(requestUrl.searchParams.get("source"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    return redirectWithOAuthError(requestUrl, source, error);
  }

  const providerError = [
    requestUrl.searchParams.get("error"),
    requestUrl.searchParams.get("error_description"),
    requestUrl.searchParams.get("error_code"),
  ].filter(Boolean).join(": ");

  return redirectWithOAuthError(requestUrl, source, providerError || "Missing OAuth code.");
}

function safeNextPath(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return value;
  }

  return "/";
}

function readOAuthSource(value: string | null): "sign-in" | "sign-up" {
  return value === "sign-up" ? "sign-up" : "sign-in";
}

function redirectWithOAuthError(requestUrl: URL, source: "sign-in" | "sign-up", error: unknown) {
  const path = source === "sign-up" ? "/sign-up" : "/sign-in";
  const message = formatOAuthCallbackError(error, source);

  return NextResponse.redirect(
    new URL(`${path}?error=${encodeURIComponent(message)}`, requestUrl.origin),
  );
}
