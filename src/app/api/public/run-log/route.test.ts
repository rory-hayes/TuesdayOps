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
    expect(consumePersistentRateLimit).toHaveBeenNthCalledWith(1, {
      scope: "public-run-log-preauth",
      identifier: "anonymous-public-run-log",
      limit: 240,
      windowSeconds: 60,
      supabase: { admin: true },
    });
    expect(consumePersistentRateLimit).toHaveBeenNthCalledWith(2, {
      scope: "public-run-log-preauth",
      identifier: "global",
      limit: 1200,
      windowSeconds: 60,
      supabase: { admin: true },
    });
    expect(consumePersistentRateLimit).toHaveBeenNthCalledWith(3, {
      scope: "public-run-log",
      identifier: "tops_key",
      limit: 120,
      windowSeconds: 60,
      supabase: { admin: true },
    });
  });

  it("uses forwarded client IPs for pre-auth rate limiting", async () => {
    const response = await POST(buildRequest({
      key: "tops_key",
      headers: {
        "x-forwarded-for": "203.0.113.10, 198.51.100.4",
        "x-real-ip": "198.51.100.99",
      },
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
      }),
    }));

    expect(response.status).toBe(201);
    expect(consumePersistentRateLimit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      identifier: "203.0.113.10",
    }));
  });

  it("falls back to the real IP header when forwarded IP is absent", async () => {
    const response = await POST(buildRequest({
      key: "tops_key",
      headers: {
        "x-real-ip": "198.51.100.99",
      },
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
      }),
    }));

    expect(response.status).toBe(201);
    expect(consumePersistentRateLimit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      identifier: "198.51.100.99",
    }));
  });

  it("rate limits pre-auth run-log submissions before token or payload work", async () => {
    vi.mocked(consumePersistentRateLimit).mockResolvedValueOnce({
      allowed: false,
      limit: 240,
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
    expect(consumePersistentRateLimit).toHaveBeenCalledTimes(1);
    expect(consumePersistentRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      scope: "public-run-log-preauth",
      identifier: "anonymous-public-run-log",
    }));
    expect(recordExternalRunLog).not.toHaveBeenCalled();
  });

  it("rate limits global pre-auth run-log submissions before token or payload work", async () => {
    vi.mocked(consumePersistentRateLimit)
      .mockResolvedValueOnce({
        allowed: true,
        limit: 240,
        remaining: 239,
        resetAt: Date.now() + 60_000,
        retryAfterSeconds: 60,
      })
      .mockResolvedValueOnce({
        allowed: false,
        limit: 1200,
        remaining: 0,
        resetAt: Date.now() + 20_000,
        retryAfterSeconds: 20,
      });

    const response = await POST(buildRequest({
      key: "tops_key",
      body: JSON.stringify({
        workflowId: "550e8400-e29b-41d4-a716-446655440000",
        status: "success",
      }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("20");
    await expect(response.json()).resolves.toEqual({ error: "Too many run log requests." });
    expect(consumePersistentRateLimit).toHaveBeenCalledTimes(2);
    expect(consumePersistentRateLimit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      scope: "public-run-log-preauth",
      identifier: "global",
    }));
    expect(recordExternalRunLog).not.toHaveBeenCalled();
  });

  it("rate limits valid keys after pre-auth throttling passes", async () => {
    vi.mocked(consumePersistentRateLimit)
      .mockResolvedValueOnce({
        allowed: true,
        limit: 240,
        remaining: 239,
        resetAt: Date.now() + 60_000,
        retryAfterSeconds: 60,
      })
      .mockResolvedValueOnce({
        allowed: true,
        limit: 1200,
        remaining: 1199,
        resetAt: Date.now() + 60_000,
        retryAfterSeconds: 60,
      })
      .mockResolvedValueOnce({
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
    expect(consumePersistentRateLimit).toHaveBeenCalledTimes(3);
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

  it("does not repeat run-log lookup work for a cached invalid bearer key", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(recordExternalRunLog).mockRejectedValueOnce(new RunLogAuthError("bad key"));

    try {
      const first = await POST(buildRequest({
        key: "tops_invalid_cached_key",
        body: JSON.stringify({
          workflowId: "550e8400-e29b-41d4-a716-446655440000",
          status: "success",
          errorMessage: "Bearer raw-payload-secret",
        }),
      }));
      const second = await POST(buildRequest({
        key: "tops_invalid_cached_key",
        body: JSON.stringify({
          workflowId: "550e8400-e29b-41d4-a716-446655440000",
          status: "success",
        }),
      }));

      expect(first.status).toBe(401);
      expect(second.status).toBe(401);
      expect(recordExternalRunLog).toHaveBeenCalledTimes(1);
      expect(consoleWarn).toHaveBeenCalledWith("Invalid public run-log bearer key rejected", {
        client: "anonymous-public-run-log",
        tokenFingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
      });
      expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain("tops_invalid_cached_key");
      expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain("raw-payload-secret");
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it("revalidates invalid bearer keys after the cache entry expires", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dateNow = vi.spyOn(Date, "now");
    dateNow.mockReturnValue(1_000);
    vi.mocked(recordExternalRunLog)
      .mockRejectedValueOnce(new RunLogAuthError("bad key"))
      .mockResolvedValueOnce({
        checkRunId: "run-2",
        status: "healthy",
        issueCreated: false,
      });

    try {
      const first = await POST(buildRequest({
        key: "tops_invalid_expiring_key",
        body: JSON.stringify({
          workflowId: "550e8400-e29b-41d4-a716-446655440000",
          status: "success",
        }),
      }));

      dateNow.mockReturnValue(1_000 + (5 * 60 * 1000) + 1);

      const second = await POST(buildRequest({
        key: "tops_invalid_expiring_key",
        body: JSON.stringify({
          workflowId: "550e8400-e29b-41d4-a716-446655440000",
          status: "success",
        }),
      }));

      expect(first.status).toBe(401);
      expect(second.status).toBe(201);
      expect(recordExternalRunLog).toHaveBeenCalledTimes(2);
    } finally {
      dateNow.mockRestore();
      consoleWarn.mockRestore();
    }
  });

  it("returns a safe generic error when the run log cannot be stored", async () => {
    vi.mocked(recordExternalRunLog).mockRejectedValueOnce(new Error("database exploded"));

    const response = await POST(buildRequest({
      key: "tops_storage_error_key",
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

function buildRequest({
  key,
  body,
  headers: extraHeaders,
}: {
  key?: string;
  body: string;
  headers?: Record<string, string>;
}) {
  const headers = new Headers({ "content-type": "application/json" });

  if (key) {
    headers.set("authorization", `Bearer ${key}`);
  }

  for (const [key, value] of Object.entries(extraHeaders ?? {})) {
    headers.set(key, value);
  }

  return new Request("https://app.example.com/api/public/run-log", {
    method: "POST",
    headers,
    body,
  }) as never;
}
