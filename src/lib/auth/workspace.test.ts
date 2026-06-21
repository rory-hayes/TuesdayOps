import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMAIL_VERIFICATION_REQUIRED_ERROR,
} from "@/lib/auth/email-verification";
import {
  getWorkspaceContext,
  requireWorkspace,
} from "@/lib/auth/workspace";
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

describe("workspace auth gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps unverified password users out of workspace lookup", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: user({
              app_metadata: { provider: "email", providers: ["email"] },
              confirmation_sent_at: "2026-06-21T18:00:00Z",
            }),
          },
        }),
      },
      from,
    } as never);

    await expect(getWorkspaceContext()).resolves.toEqual({
      user: expect.objectContaining({ id: "user-1" }),
      workspace: null,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("redirects unverified password users away from protected app routes", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: user({
              app_metadata: { provider: "email", providers: ["email"] },
              confirmation_sent_at: "2026-06-21T18:00:00Z",
            }),
          },
        }),
      },
      from: vi.fn(),
    } as never);

    await expectRedirect(
      requireWorkspace(),
      `/sign-in?error=${encodeURIComponent(EMAIL_VERIFICATION_REQUIRED_ERROR)}`,
    );
  });

  it("keeps OAuth users on the normal workspace path", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle,
          }),
        }),
      }),
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: user({
              app_metadata: { provider: "google", providers: ["google"] },
              identities: [
                {
                  id: "identity-1",
                  user_id: "user-1",
                  identity_id: "identity-1",
                  provider: "google",
                },
              ],
            }),
          },
        }),
      },
      from,
    } as never);

    await expectRedirect(requireWorkspace(), "/onboarding");

    expect(from).toHaveBeenCalledWith("memberships");
    expect(maybeSingle).toHaveBeenCalled();
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

async function expectRedirect(promise: Promise<unknown>, url: string) {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${url}`);
  expect(mocks.redirect).toHaveBeenCalledWith(url);
}
