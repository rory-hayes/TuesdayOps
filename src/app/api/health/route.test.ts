import { describe, expect, it, vi } from "vitest";
import { buildPublicHealthPayload } from "@/lib/production/readiness";
import { GET } from "./route";

vi.mock("@/lib/production/readiness", () => ({
  buildPublicHealthPayload: vi.fn(() => ({
    status: "ok",
    generatedAt: "2026-06-15T00:00:00.000Z",
    checks: [],
  })),
}));

describe("health route", () => {
  it("returns the public production health payload", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      generatedAt: "2026-06-15T00:00:00.000Z",
      checks: [],
    });
    expect(buildPublicHealthPayload).toHaveBeenCalledOnce();
  });
});
