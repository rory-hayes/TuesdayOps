import { describe, expect, it } from "vitest";
import {
  formatProductionSmokeReport,
  runProductionSmoke,
  type ProductionSmokeCheck,
} from "./smoke";

describe("runProductionSmoke", () => {
  it("passes when production health is ready and privileged smoke routes are protected", async () => {
    const requests: Array<{ url: string; method: string }> = [];
    const result = await runProductionSmoke({
      appUrl: "https://tuesday-ops.vercel.app/settings?billing=ok",
      fetchImpl: buildFetch(
        {
          "/api/health": jsonResponse({
            ok: true,
            status: "ready",
            launchReady: true,
            checks: [
              { id: "app", status: "ready", required: true },
              { id: "supabase", status: "ready", required: true },
              { id: "scheduler", status: "ready", required: true },
              { id: "email", status: "ready", required: true },
              { id: "billing", status: "ready", required: true },
              { id: "observability", status: "ready", required: true },
            ],
          }),
          "/sentry-example-page": textResponse("not found", 404),
          "/api/sentry-example-api": jsonResponse({ error: "Not found." }, 404),
          "/api/scheduler/run-due-checks": jsonResponse({ error: "Unauthorized scheduler trigger." }, 401),
        },
        requests,
      ),
    });

    expect(result.ok).toBe(true);
    expect(result.appUrl).toBe("https://tuesday-ops.vercel.app");
    expect(result.checks.map((check) => [check.id, check.status])).toEqual([
      ["health", "pass"],
      ["sentry-example-page", "pass"],
      ["sentry-example-api", "pass"],
      ["scheduler-protection", "pass"],
    ]);
    expect(requests).toEqual([
      { url: "https://tuesday-ops.vercel.app/api/health", method: "GET" },
      { url: "https://tuesday-ops.vercel.app/sentry-example-page", method: "GET" },
      { url: "https://tuesday-ops.vercel.app/api/sentry-example-api", method: "GET" },
      { url: "https://tuesday-ops.vercel.app/api/scheduler/run-due-checks", method: "POST" },
    ]);
  });

  it("fails health when launch readiness is degraded or the public payload leaks secret-shaped values", async () => {
    const result = await runProductionSmoke({
      appUrl: "https://tuesday-ops.vercel.app",
      fetchImpl: buildFetch({
        "/api/health": jsonResponse({
          ok: true,
          status: "degraded",
          launchReady: false,
          checks: [{ id: "billing", status: "missing", detail: "sk_live_secret", required: true }],
        }),
        "/sentry-example-page": textResponse("not found", 404),
        "/api/sentry-example-api": jsonResponse({ error: "Not found." }, 404),
        "/api/scheduler/run-due-checks": jsonResponse({ error: "Unauthorized scheduler trigger." }, 401),
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.checks[0]).toMatchObject<Partial<ProductionSmokeCheck>>({
      id: "health",
      label: "Public provider health",
      status: "fail",
    });
    expect(result.checks[0]?.detail).toContain("not launch ready");
    expect(result.checks[0]?.detail).toContain("secret-shaped");
  });

  it("detects secret-shaped values consistently across repeated smoke runs", async () => {
    const fetchImpl = buildFetch({
      "/api/health": jsonResponse({
        ok: true,
        status: "ready",
        launchReady: true,
        checks: [{ id: "billing", status: "ready", detail: "sk_live_secret", required: true }],
      }),
      "/sentry-example-page": textResponse("not found", 404),
      "/api/sentry-example-api": jsonResponse({ error: "Not found." }, 404),
      "/api/scheduler/run-due-checks": jsonResponse({ error: "Unauthorized scheduler trigger." }, 401),
    });

    const first = await runProductionSmoke({ appUrl: "https://tuesday-ops.vercel.app", fetchImpl });
    const second = await runProductionSmoke({ appUrl: "https://tuesday-ops.vercel.app", fetchImpl });

    expect(first.checks[0]?.detail).toContain("secret-shaped");
    expect(second.checks[0]?.detail).toContain("secret-shaped");
  });

  it("fails health when the public endpoint is unavailable or returns non-json", async () => {
    const result = await runProductionSmoke({
      appUrl: "https://tuesday-ops.vercel.app",
      fetchImpl: buildFetch({
        "/api/health": textResponse("service unavailable", 503),
        "/sentry-example-page": textResponse("not found", 404),
        "/api/sentry-example-api": jsonResponse({ error: "Not found." }, 404),
        "/api/scheduler/run-due-checks": jsonResponse({ error: "Unauthorized scheduler trigger." }, 401),
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.checks[0]?.detail).toContain("Expected HTTP 200, received 503");
    expect(result.checks[0]?.detail).toContain("not launch ready");
  });

  it("redacts failed health requests and reports non-error request failures", async () => {
    const result = await runProductionSmoke({
      appUrl: "https://tuesday-ops.vercel.app",
      fetchImpl: async (input) => {
        const path = new URL(String(input)).pathname;

        if (path === "/api/health") {
          throw new Error("Bearer sk_test_secret");
        }

        if (path === "/sentry-example-page") {
          throw "network down";
        }

        return path === "/api/scheduler/run-due-checks"
          ? jsonResponse({ error: "Unauthorized scheduler trigger." }, 401)
          : jsonResponse({ error: "Not found." }, 404);
      },
    });

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === "health")?.detail).toBe(
      "Request failed: Bearer [redacted].",
    );
    expect(result.checks.find((check) => check.id === "sentry-example-page")?.detail).toBe(
      "Request failed: Unknown production smoke error.",
    );
  });

  it("fails when temporary Sentry smoke routes are exposed in production", async () => {
    const result = await runProductionSmoke({
      appUrl: "https://tuesday-ops.vercel.app",
      fetchImpl: buildFetch({
        "/api/health": jsonResponse({ ok: true, status: "ready", launchReady: true, checks: [] }),
        "/sentry-example-page": textResponse("throw sample error", 200),
        "/api/sentry-example-api": textResponse("sample backend error", 500),
        "/api/scheduler/run-due-checks": jsonResponse({ error: "Unauthorized scheduler trigger." }, 401),
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === "sentry-example-page")).toMatchObject({
      status: "fail",
      detail: "Expected 404, received 200.",
    });
    expect(result.checks.find((check) => check.id === "sentry-example-api")).toMatchObject({
      status: "fail",
      detail: "Expected 404, received 500.",
    });
  });

  it("fails when the scheduler route accepts unauthenticated production requests", async () => {
    const result = await runProductionSmoke({
      appUrl: "https://tuesday-ops.vercel.app",
      fetchImpl: buildFetch({
        "/api/health": jsonResponse({ ok: true, status: "ready", launchReady: true, checks: [] }),
        "/sentry-example-page": textResponse("not found", 404),
        "/api/sentry-example-api": jsonResponse({ error: "Not found." }, 404),
        "/api/scheduler/run-due-checks": jsonResponse({ ok: true, attempted: 1 }, 200),
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === "scheduler-protection")).toMatchObject({
      status: "fail",
      detail: "Expected 401, received 200.",
    });
  });

  it("rejects malformed or non-http smoke URLs", async () => {
    await expect(
      runProductionSmoke({
        appUrl: "ftp://tuesday-ops.vercel.app",
        fetchImpl: buildFetch({}),
      }),
    ).rejects.toThrow("Production smoke URL must use http or https");

    await expect(
      runProductionSmoke({
        appUrl: "not a url",
        fetchImpl: buildFetch({}),
      }),
    ).rejects.toThrow("Invalid URL");
  });
});

describe("formatProductionSmokeReport", () => {
  it("formats a passing operator report", () => {
    const report = formatProductionSmokeReport({
      ok: true,
      appUrl: "https://tuesday-ops.vercel.app",
      checkedAt: "2026-06-15T22:00:00.000Z",
      checks: [
        {
          id: "scheduler-protection",
          label: "Scheduler route requires secret",
          status: "pass",
          detail: "Received expected 401.",
        },
      ],
    });

    expect(report).toContain("Production smoke passed for https://tuesday-ops.vercel.app");
    expect(report).toContain("[pass] Scheduler route requires secret");
  });

  it("formats a readable operator report without secret material", () => {
    const report = formatProductionSmokeReport({
      ok: false,
      appUrl: "https://tuesday-ops.vercel.app",
      checkedAt: "2026-06-15T22:00:00.000Z",
      checks: [
        {
          id: "health",
          label: "Public provider health",
          status: "fail",
          detail: "Public health leaked sk_live_secret.",
        },
      ],
    });

    expect(report).toContain("Production smoke failed for https://tuesday-ops.vercel.app");
    expect(report).toContain("[fail] Public provider health");
    expect(report).not.toContain("sk_live_secret");
    expect(report).toContain("[redacted]");
  });
});

function buildFetch(
  responses: Record<string, Response>,
  requests?: Array<{ url: string; method: string }>,
): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const parsedUrl = new URL(url);
    requests?.push({ url, method: init?.method ?? "GET" });
    const response = responses[parsedUrl.pathname];

    if (!response) {
      return textResponse("not found", 404);
    }

    return response.clone();
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}
