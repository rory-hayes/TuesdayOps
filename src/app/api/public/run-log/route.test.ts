import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordExternalRunLog, RunLogAuthError } from "@/lib/run-logs/service";
import { consumePersistentRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/run-logs/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/run-logs/service")>();

  return {
    ...actual,
    recordExternalRunLog: vi.fn(),
  };
});

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

describe("public run-log route", () => {
  beforeEach(() => {
    vi.mocked(recordExternalRunLog).mockReset();
    vi.mocked(consumePersistentRateLimit).mockReset();
    vi.mocked(createAdminClient).mockClear();
    vi.mocked(consumePersistentRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
    });
    vi.mocked(recordExternalRunLog).mockResolvedValue({
      checkRunId: "run-1",
      status: "healthy",
      issueCreated: false,
    });
  });

  it("rejects missing bearer keys before privileged work", async () => {
    const response = await POST(buildRequest({ body: "{}" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Run log API key is required." });
    expect(recordExternalRunLog).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads", async () => {
    const malformed = await POST(buildRequest({
      key: "tops_key",
      body: "{",
    }));

    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: "Run log payload was invalid." });

    const response = await POST(buildRequest({
      key: "tops_key",
      body: JSON.stringify({ workflowId: "not-a-uuid", status: "success" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Run log payload was invalid." });
  });

  it("rethrows unexpected request parsing errors", async () => {
    await expect(POST({
      headers: new Headers({ authorization: "Bearer tops_key" }),
      json: async () => {
        throw new Error("unexpected parser failure");
      },
    } as never)).rejects.toThrow("unexpected parser failure");
  });

  it("records valid external run logs", async () => {
    const response = await POST(buildRequest({
      key: "tops_key",
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
        latencyMs: 210,
      }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      checkRunId: "run-1",
      status: "healthy",
      issueCreated: false,
    });
    expect(recordExternalRunLog).toHaveBeenCalledWith({
      supabase: { admin: true },
      apiKey: "tops_key",
      payload: {
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
        latencyMs: 210,
      },
    });
    expect(createAdminClient).toHaveBeenCalledTimes(1);
  });

  it("rate limits run-log submissions before payload work is recorded", async () => {
    vi.mocked(consumePersistentRateLimit).mockResolvedValueOnce({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfterSeconds: 30,
    });

    const response = await POST(buildRequest({
      key: "tops_key",
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
      }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    await expect(response.json()).resolves.toEqual({ error: "Too many run log requests." });
    expect(recordExternalRunLog).not.toHaveBeenCalled();
  });

  it("returns a safe auth error when the key is invalid", async () => {
    vi.mocked(recordExternalRunLog).mockRejectedValueOnce(new RunLogAuthError("bad key"));

    const response = await POST(buildRequest({
      key: "tops_key",
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
        latencyMs: 210,
      }),
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Run log API key was invalid." });
  });

  it("returns a safe generic error when the run log cannot be stored", async () => {
    vi.mocked(recordExternalRunLog).mockRejectedValueOnce(new Error("database exploded"));

    const response = await POST(buildRequest({
      key: "tops_key",
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
        latencyMs: 210,
      }),
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Run log could not be recorded." });
  });
});

function buildRequest({ key, body }: { key?: string; body: string }) {
  const headers = new Headers({ "content-type": "application/json" });

  if (key) {
    headers.set("authorization", `Bearer ${key}`);
  }

  return new Request("https://app.example.com/api/public/run-log", {
    method: "POST",
    headers,
    body,
  }) as never;
}
