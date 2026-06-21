import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("google auth route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  });

  it("starts Google OAuth with a plain redirect to the provider URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://supabase.example.com/auth/v1/authorize?provider=google" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithOAuth },
    } as never);

    const response = await GET(new Request("https://app.example.com/auth/google?source=sign-up") as never);

    expect(response.headers.get("location")).toBe(
      "https://supabase.example.com/auth/v1/authorize?provider=google",
    );
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app.example.com/auth/callback?next=/onboarding&source=sign-up",
      },
    });
  });

  it("returns OAuth errors to the originating sign-up page with safe copy", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: new Error("Provider failed for ops@example.com with token=secret"),
        }),
      },
    } as never);

    const response = await GET(new Request("https://app.example.com/auth/google?source=sign-up") as never);

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-up?error=Google%20sign-in%20could%20not%20be%20started.%20Refresh%20the%20page%20and%20try%20again.",
    );
  });

  it("defaults invalid source values back to the sign-in page", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: new Error("Provider failed"),
        }),
      },
    } as never);

    const response = await GET(new Request("https://app.example.com/auth/google?source=settings") as never);

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-in?error=Google%20sign-in%20could%20not%20be%20started.%20Refresh%20the%20page%20and%20try%20again.",
    );
  });
});
