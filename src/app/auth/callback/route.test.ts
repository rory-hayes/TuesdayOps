import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects valid local next paths after session exchange", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const response = await GET(new Request("https://app.example.com/auth/callback?code=valid&next=/workflows") as never);

    expect(response.headers.get("location")).toBe("https://app.example.com/workflows");
  });

  it("rejects backslash authority redirects in the next path", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const response = await GET(new Request("https://app.example.com/auth/callback?code=valid&next=/%5Cevil.example") as never);

    expect(response.headers.get("location")).toBe("https://app.example.com/");
  });

  it("returns provider errors to sign-in with safe copy", async () => {
    const response = await GET(
      new Request("https://app.example.com/auth/callback?error=access_denied&error_description=User%20denied") as never,
    );

    expect(createClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-in?error=Google%20sign-in%20could%20not%20be%20completed.%20Try%20again.",
    );
  });

  it("returns missing codes to sign-in with safe copy", async () => {
    const response = await GET(new Request("https://app.example.com/auth/callback?next=/onboarding") as never);

    expect(createClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-in?error=Google%20sign-in%20could%20not%20be%20completed.%20Try%20again.",
    );
  });

  it("returns exchange failures to sign-in with safe copy", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: new Error("The sign-in link was invalid or expired."),
        }),
      },
    } as never);

    const response = await GET(new Request("https://app.example.com/auth/callback?code=expired") as never);

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-in?error=Google%20sign-in%20could%20not%20be%20completed.%20Try%20again.",
    );
  });
});
