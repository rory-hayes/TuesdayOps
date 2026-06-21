import { NextResponse, type NextRequest } from "next/server";
import { formatOAuthError } from "@/lib/auth/feedback";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type OAuthSource = "sign-in" | "sign-up";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const source = parseSource(requestUrl.searchParams.get("source"));

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAppUrl()}/auth/callback?next=/onboarding&source=${source}`,
      },
    });

    if (error) {
      throw error;
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }
  } catch (error) {
    return NextResponse.redirect(new URL(buildGoogleOAuthErrorRedirect(source, formatOAuthError(error)), requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL(
      buildGoogleOAuthErrorRedirect(source, "Google sign-in could not be started. Refresh the page and try again."),
      requestUrl.origin,
    ),
  );
}

function parseSource(value: string | null): OAuthSource {
  return value === "sign-up" ? "sign-up" : "sign-in";
}

function buildGoogleOAuthErrorRedirect(source: OAuthSource, message: string): string {
  const path = source === "sign-up" ? "/sign-up" : "/sign-in";

  return `${path}?error=${encodeURIComponent(message)}`;
}
