import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDueMonthlyReports } from "@/lib/reports/scheduler";
import { consumePersistentRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/reports/scheduler", () => ({
  runDueMonthlyReports: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getSchedulerSecret: () => "scheduler-secret",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ admin: true })),
}));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();

  return {
    ...actual,
    consumePersistentRateLimit: vi.fn(),
  };
});

describe("scheduler run-monthly-reports route", () => {
  beforeEach(() => {
    vi.mocked(runDueMonthlyReports).mockReset();
    vi.mocked(consumePersistentRateLimit).mockReset();
    vi.mocked(createAdminClient).mockClear();
    vi.mocked(consumePersistentRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
    });
    vi.mocked(runDueMonthlyReports).mockResolvedValue({
      attempted: 2,
      generated: 1,
      skipped: 0,
      failed: 1,
    });
  });

  it("rejects unauthorized scheduler requests", async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized scheduler trigger." });
    expect(runDueMonthlyReports).not.toHaveBeenCalled();
  });

  it("runs monthly report automation with bearer authentication", async () => {
    const response = await POST(buildRequest({ authorization: "Bearer scheduler-secret" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      attempted: 2,
      generated: 1,
      skipped: 0,
      failed: 1,
    });
    expect(runDueMonthlyReports).toHaveBeenCalledWith({
      supabase: { admin: true },
    });
  });

  it("runs monthly report automation with scheduler header authentication", async () => {
    const response = await POST(buildRequest({ schedulerSecret: "scheduler-secret" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(runDueMonthlyReports).toHaveBeenCalledWith({
      supabase: { admin: true },
    });
  });

  it("rate limits authorized monthly report scheduler calls", async () => {
    vi.mocked(consumePersistentRateLimit).mockResolvedValueOnce({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 20_000,
      retryAfterSeconds: 20,
    });

    const response = await POST(buildRequest({ schedulerSecret: "scheduler-secret" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("20");
    await expect(response.json()).resolves.toEqual({ error: "Too many scheduler trigger attempts." });
    expect(runDueMonthlyReports).not.toHaveBeenCalled();
  });
});

function buildRequest({
  authorization,
  schedulerSecret,
}: {
  authorization?: string;
  schedulerSecret?: string;
}) {
  const headers = new Headers();

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (schedulerSecret) {
    headers.set("x-scheduler-secret", schedulerSecret);
  }

  return new Request("https://app.example.com/api/scheduler/run-monthly-reports", {
    method: "POST",
    headers,
  }) as never;
}
