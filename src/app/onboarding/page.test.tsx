import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  EMAIL_VERIFICATION_REQUIRED_ERROR,
} from "@/lib/auth/email-verification";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import OnboardingPage from "./page";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/workspace", () => ({
  getWorkspaceContext: vi.fn(),
}));

describe("OnboardingPage", () => {
  it("redirects unverified password users to the email verification gate", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      user: user({
        app_metadata: { provider: "email", providers: ["email"] },
        confirmation_sent_at: "2026-06-21T18:00:00Z",
      }),
      workspace: null,
    });

    await expect(
      OnboardingPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/sign-in?error=${encodeURIComponent(EMAIL_VERIFICATION_REQUIRED_ERROR)}`,
    );
  });
});

function user(overrides: Partial<User>): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    email: "ops@example.com",
    created_at: "2026-06-21T18:00:00Z",
    ...overrides,
  };
}
