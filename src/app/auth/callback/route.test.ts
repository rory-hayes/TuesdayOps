import { describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("auth callback route", () => {
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

  it("uses account-creation guidance when Google sign-in has no linked user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("User not found") }),
      },
    } as never);

    const response = await GET(
      new Request("https://app.example.com/auth/callback?code=valid&source=sign-in") as never,
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-in?error=No%20account%20is%20linked%20to%20that%20Google%20profile%20yet.%20Create%20an%20account%20first%2C%20then%20continue%20with%20Google.",
    );
  });

  it("returns Google sign-up failures to the sign-up page", async () => {
    const response = await GET(
      new Request(
        "https://app.example.com/auth/callback?source=sign-up&error=access_denied&error_description=user%20cancelled",
      ) as never,
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-up?error=Google%20sign-in%20was%20cancelled.%20Choose%20Continue%20with%20Google%20to%20try%20again.",
    );
  });

  it("uses email verification copy for confirmation-link failures", async () => {
    const response = await GET(
      new Request(
        "https://app.example.com/auth/callback?source=sign-up&flow=email-verification&error=invalid_grant&error_description=expired%20code",
      ) as never,
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-up?error=That%20verification%20link%20expired.%20Sign%20up%20again%20with%20the%20same%20email%20to%20request%20a%20new%20one.",
    );
  });
});
