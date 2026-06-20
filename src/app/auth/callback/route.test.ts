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
});
