import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDueScheduledChecks } from "@/lib/checks/scheduled-runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/checks/scheduled-runner", () => ({
  runDueScheduledChecks: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getSchedulerSecret: () => "scheduler-secret",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ admin: true })),
}));

describe("scheduler run-due-checks route", () => {
  beforeEach(() => {
    vi.mocked(runDueScheduledChecks).mockReset();
    vi.mocked(createAdminClient).mockClear();
    vi.mocked(runDueScheduledChecks).mockResolvedValue({
      attempted: 2,
      completed: 1,
      skipped: 1,
      failed: 0,
    });
  });

  it("rejects unauthorized scheduler requests", async () => {
    const response = await POST(buildRequest({ ip: "203.0.113.10", body: "{}" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized scheduler trigger." });
    expect(runDueScheduledChecks).not.toHaveBeenCalled();
  });

  it("rejects malformed and schema-invalid JSON bodies", async () => {
    const malformed = await POST(
      buildRequest({
        ip: "203.0.113.11",
        authorization: "Bearer scheduler-secret",
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({
      error: "Scheduler request body must be valid JSON.",
    });

    const invalid = await POST(
      buildRequest({
        ip: "203.0.113.12",
        authorization: "Bearer scheduler-secret",
        body: JSON.stringify({ checkId: "not-a-uuid" }),
      }),
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "Scheduler request body was invalid." });
  });

  it("runs due checks with bearer or header authentication", async () => {
    const response = await POST(
      buildRequest({
        ip: "203.0.113.13",
        authorization: "Bearer scheduler-secret",
        body: JSON.stringify({ checkId: "550e8400-e29b-41d4-a716-446655440000" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      attempted: 2,
      completed: 1,
      skipped: 1,
      failed: 0,
    });
    expect(runDueScheduledChecks).toHaveBeenCalledWith({
      supabase: { admin: true },
      checkId: "550e8400-e29b-41d4-a716-446655440000",
    });

    const headerAuth = await POST(
      buildRequest({
        ip: "203.0.113.14",
        schedulerSecret: "scheduler-secret",
        body: "",
      }),
    );

    expect(headerAuth.status).toBe(200);
    await expect(headerAuth.json()).resolves.toMatchObject({ ok: true });
    expect(runDueScheduledChecks).toHaveBeenLastCalledWith({
      supabase: { admin: true },
      checkId: undefined,
    });
  });

  it("rate limits repeated scheduler trigger attempts before any privileged work runs", async () => {
    for (let index = 0; index < 30; index += 1) {
      const response = await POST(
        buildRequest({
          ip: "203.0.113.15",
          authorization: "Bearer wrong-secret",
          body: "{}",
        }),
      );
      expect(response.status).toBe(401);
    }

    const limited = await POST(
      buildRequest({
        ip: "203.0.113.15",
        authorization: "Bearer wrong-secret",
        body: "{}",
      }),
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get("X-RateLimit-Limit")).toBe("30");
    await expect(limited.json()).resolves.toEqual({ error: "Too many scheduler trigger attempts." });
  });
});

function buildRequest({
  ip,
  body,
  authorization,
  schedulerSecret,
}: {
  ip: string;
  body: string;
  authorization?: string;
  schedulerSecret?: string;
}) {
  const headers = new Headers({ "x-forwarded-for": ip });

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (schedulerSecret) {
    headers.set("x-scheduler-secret", schedulerSecret);
  }

  return new Request("https://app.example.com/api/scheduler/run-due-checks", {
    method: "POST",
    headers,
    body,
  }) as never;
}
