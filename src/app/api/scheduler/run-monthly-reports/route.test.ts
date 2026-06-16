import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDueMonthlyReports } from "@/lib/reports/scheduler";
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

describe("scheduler run-monthly-reports route", () => {
  beforeEach(() => {
    vi.mocked(runDueMonthlyReports).mockReset();
    vi.mocked(createAdminClient).mockClear();
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
