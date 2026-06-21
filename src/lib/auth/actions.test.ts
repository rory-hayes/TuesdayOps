import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  signInAction,
  signInWithGoogleAction,
  signUpAction,
} from "@/lib/auth/actions";
import {
  EMAIL_VERIFICATION_PENDING_NOTICE,
  EMAIL_VERIFICATION_REQUIRED_ERROR,
} from "@/lib/auth/email-verification";
import { createClient } from "@/lib/supabase/server";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

describe("auth server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  });

  it("starts Google OAuth and redirects to the Supabase provider URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://supabase.example.com/auth/v1/authorize?provider=google" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithOAuth },
    } as never);

    await expectRedirect(
      signInWithGoogleAction(formData({ source: "sign-up" })),
      "https://supabase.example.com/auth/v1/authorize?provider=google",
    );

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app.example.com/auth/callback?next=/onboarding&source=sign-up",
      },
    });
  });

  it("redirects new password signups to a pending-verification notice", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const signUp = vi.fn().mockResolvedValue({
      data: {
        session: null,
        user: {
          id: "user-1",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          aud: "authenticated",
          email: "ops@example.com",
          created_at: "2026-06-21T18:00:00Z",
          confirmation_sent_at: "2026-06-21T18:00:00Z",
        },
      },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { signUp, signOut },
    } as never);

    await expectRedirect(
      signUpAction(formData({
        email: "ops@example.com",
        password: "Tuesday-2026!",
        confirmPassword: "Tuesday-2026!",
      })),
      `/sign-in?notice=${encodeURIComponent(EMAIL_VERIFICATION_PENDING_NOTICE)}`,
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "ops@example.com",
      password: "Tuesday-2026!",
      options: {
        emailRedirectTo: "https://app.example.com/auth/callback?next=/onboarding&source=sign-up&flow=email-verification",
      },
    });
    expect(signOut).toHaveBeenCalled();
  });

  it("signs out unverified password sessions before redirecting from sign-in", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: { access_token: "temporary-session" },
        user: {
          id: "user-1",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          aud: "authenticated",
          email: "ops@example.com",
          created_at: "2026-06-21T18:00:00Z",
          confirmation_sent_at: "2026-06-21T18:00:00Z",
        },
      },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword, signOut },
    } as never);

    await expectRedirect(
      signInAction(formData({
        email: "ops@example.com",
        password: "Tuesday-2026!",
      })),
      `/sign-in?error=${encodeURIComponent(EMAIL_VERIFICATION_REQUIRED_ERROR)}`,
    );

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "ops@example.com",
      password: "Tuesday-2026!",
    });
    expect(signOut).toHaveBeenCalled();
  });

  it("allows confirmed password users through sign-in", async () => {
    const signOut = vi.fn();
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: { access_token: "confirmed-session" },
        user: {
          id: "user-1",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          aud: "authenticated",
          email: "ops@example.com",
          created_at: "2026-06-21T18:00:00Z",
          email_confirmed_at: "2026-06-21T18:01:00Z",
        },
      },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword, signOut },
    } as never);

    await expectRedirect(
      signInAction(formData({
        email: "ops@example.com",
        password: "Tuesday-2026!",
      })),
      "/",
    );

    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns Google OAuth errors to the originating sign-up page with safe copy", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: new Error("Provider failed for ops@example.com with token=secret"),
        }),
      },
    } as never);

    await expectRedirect(
      signInWithGoogleAction(formData({ source: "sign-up" })),
      "/sign-up?error=Google%20sign-in%20could%20not%20be%20started.%20Refresh%20the%20page%20and%20try%20again.",
    );
  });

  it("defaults invalid OAuth source values back to the sign-in page", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: new Error("Provider failed"),
        }),
      },
    } as never);

    await expectRedirect(
      signInWithGoogleAction(formData({ source: "settings" })),
      "/sign-in?error=Google%20sign-in%20could%20not%20be%20started.%20Refresh%20the%20page%20and%20try%20again.",
    );
  });
});

function formData(values: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

async function expectRedirect(promise: Promise<void>, url: string) {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${url}`);
  expect(mocks.redirect).toHaveBeenCalledWith(url);
}
