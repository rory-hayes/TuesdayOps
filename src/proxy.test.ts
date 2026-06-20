import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { proxy } from "./proxy";

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn(),
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["/auth/google", "/auth/callback"])("bypasses Supabase session refresh for %s", async (path) => {
    const response = await proxy(requestFor(path));

    expect(updateSession).not.toHaveBeenCalled();
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("refreshes Supabase sessions for normal application routes", async () => {
    const response = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue(response);
    const request = requestFor("/onboarding");

    await expect(proxy(request)).resolves.toBe(response);
    expect(updateSession).toHaveBeenCalledWith(request);
  });
});

function requestFor(path: string): NextRequest {
  const request = new Request(`https://app.example.com${path}`);
  Object.defineProperty(request, "nextUrl", {
    value: new URL(request.url),
  });

  return request as NextRequest;
}
