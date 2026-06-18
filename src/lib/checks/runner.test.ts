import { describe, expect, it, vi } from "vitest";
import { runHttpCheck, type WorkflowHttpTransport } from "./runner";

vi.mock("@/lib/security/endpoint-url-server", () => ({
  resolveSafeWorkflowEndpoint: vi.fn(async (value: string) => ({
    endpointUrl: value,
    url: new URL(value),
    resolvedAddress: "203.0.113.10",
  })),
}));

describe("runHttpCheck", () => {
  it("does not automatically follow workflow endpoint redirects", async () => {
    const transport = createTransport([
      { statusCode: 302, bodyText: "", truncated: false },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/health",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: expect.objectContaining({
          endpointUrl: "https://api.example.com/health",
          resolvedAddress: "203.0.113.10",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "failed",
      statusCode: 302,
      errorMessage: "Workflow endpoint returned a redirect. Redirects are blocked for check safety.",
      responseSummary: "Redirect blocked for workflow check safety.",
    });
  });

  it("marks response summaries as truncated when the body exceeds the retained limit", async () => {
    const transport = createTransport([
      { statusCode: 200, bodyText: "x".repeat(600), truncated: true },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/health",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(result.status).toBe("healthy");
    expect(result.responseSummary).toContain("[truncated]");
    expect(result.responseSummary.length).toBeLessThanOrEqual(600);
  });

  it("marks latency and content assertion misses as degraded instead of failed", async () => {
    const transport = createTransport([
      { statusCode: 200, bodyText: JSON.stringify({ ok: true }), truncated: false },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/slow",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [
            { type: "status_code", expected: 200 },
            { type: "latency_under", maxMs: 1 },
            { type: "field_exists", path: "missing" },
          ],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(result.status).toBe("degraded");
    expect(result.statusCode).toBe(200);
  });

  it("handles successful responses with no readable body stream", async () => {
    const transport = createTransport([
      { statusCode: 204, bodyText: "", truncated: false },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/empty",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 204 }],
        },
      },
      authConfig: undefined,
      transport,
    });

    expect(result).toMatchObject({
      status: "healthy",
      statusCode: 204,
      responseSummary: "",
    });
  });

  it("sends POST bodies with JSON content type and redacts response summaries", async () => {
    const transport = createTransport([
      {
        statusCode: 201,
        bodyText: JSON.stringify({
          email: "patient@example.com",
          token: "secret-token",
        }),
        truncated: false,
      },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/intake",
        method: "POST",
        authType: "bearer",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          requestBody: '{"ping":true}',
          assertions: [
            { type: "status_code", expected: 201 },
            { type: "field_exists", path: "token" },
          ],
        },
      },
      authConfig: { type: "bearer", token: "workflow-token" },
      transport,
    });

    const [{ config, headers, workflow }] = transport.mock.calls[0];
    expect(workflow.method).toBe("POST");
    expect(config.requestBody).toBe('{"ping":true}');
    expect(headers.get("authorization")).toBe("Bearer workflow-token");
    expect(result.status).toBe("healthy");
    expect(result.responseSummary).toContain("[redacted-email]");
    expect(result.responseSummary).toContain('"token":"[redacted]"');
  });

  it("collapses HTML error pages into readable response summaries", async () => {
    const transport = createTransport([
      {
        statusCode: 404,
        bodyText: `<!doctype html><html><head><title>404: Not Found</title><style>body{}</style><script>window.__secret = "token";</script></head><body><h1>404</h1><p>This page could not be found.</p></body></html>`,
        truncated: false,
      },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/missing",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(result.status).toBe("failed");
    expect(result.responseSummary).toBe("404: Not Found 404 This page could not be found.");
    expect(result.responseSummary).not.toContain("<html");
    expect(result.responseSummary).not.toContain("window.__secret");
  });

  it("uses a safe placeholder for empty HTML responses", async () => {
    const transport = createTransport([
      {
        statusCode: 500,
        bodyText: "<html><script>console.log('only script')</script></html>",
        truncated: false,
      },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/empty-html",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(result.responseSummary).toBe("HTML response received.");
  });

  it("supports API key and basic auth headers", async () => {
    const transport = createTransport([
      { statusCode: 200, bodyText: "ok", truncated: false },
      { statusCode: 200, bodyText: "ok", truncated: false },
    ]);

    await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/key",
        method: "GET",
        authType: "api_key_header",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "api_key_header", headerName: "x-api-key", value: "key-123" },
      transport,
    });

    expect(transport.mock.calls[0][0].headers.get("x-api-key")).toBe("key-123");

    await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/basic",
        method: "GET",
        authType: "basic",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "basic", username: "user", password: "pass" },
      transport,
    });

    expect(transport.mock.calls[1][0].headers.get("authorization")).toBe(
      `Basic ${Buffer.from("user:pass").toString("base64")}`,
    );
  });

  it("only sends auth headers when decrypted auth matches the workflow auth type", async () => {
    const transport = createTransport([
      { statusCode: 200, bodyText: "ok", truncated: false },
      { statusCode: 200, bodyText: "ok", truncated: false },
    ]);
    const input = {
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code" as const, expected: 200 }],
        },
      },
      transport,
    };

    await runHttpCheck({
      ...input,
      workflow: {
        endpointUrl: "https://api.example.com/no-auth",
        method: "GET",
        authType: "none",
      },
      authConfig: { type: "bearer", token: "stale-token" },
    });

    await runHttpCheck({
      ...input,
      workflow: {
        endpointUrl: "https://api.example.com/bearer",
        method: "GET",
        authType: "bearer",
      },
      authConfig: { type: "api_key_header", headerName: "x-api-key", value: "stale-key" },
    });

    expect(transport.mock.calls[0][0].headers.get("authorization")).toBeNull();
    expect(transport.mock.calls[0][0].headers.get("x-api-key")).toBeNull();
    expect(transport.mock.calls[1][0].headers.get("authorization")).toBeNull();
    expect(transport.mock.calls[1][0].headers.get("x-api-key")).toBeNull();
  });

  it("retries transport failures once before recording the result", async () => {
    const transport = createTransport([
      new Error("socket hang up"),
      { statusCode: 200, bodyText: "{\"ok\":true}", truncated: false },
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/retry",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code", expected: 200 }],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(transport).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      status: "healthy",
      statusCode: 200,
    });
  });

  it("records request failures as failed checks with unevaluated assertions", async () => {
    const transport = createTransport([
      new Error("connect ECONNREFUSED"),
      new Error("connect ECONNREFUSED"),
    ]);

    const result = await runHttpCheck({
      workflow: {
        endpointUrl: "https://api.example.com/down",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [
            { type: "status_code", expected: 200 },
            { type: "latency_under", maxMs: 500 },
          ],
        },
      },
      authConfig: { type: "none" },
      transport,
    });

    expect(result).toMatchObject({
      status: "failed",
      responseSummary: "",
      errorMessage: "connect ECONNREFUSED",
    });
    expect(result.assertionResults).toHaveLength(2);
    expect(result.assertionResults.every((assertion) => !assertion.passed)).toBe(true);
  });

  it("normalizes non-Error request failures and abort errors", async () => {
    const input = {
      workflow: {
        endpointUrl: "https://api.example.com/down",
        method: "GET" as const,
        authType: "none" as const,
      },
      check: {
        configJson: {
          timeoutMs: 1000,
          assertions: [{ type: "status_code" as const, expected: 200 }],
        },
      },
      authConfig: { type: "none" as const },
    };

    await expect(runHttpCheck({ ...input, transport: createTransport(["network failed", "network failed"]) })).resolves.toMatchObject({
      status: "failed",
      errorMessage: "Unknown check runner error.",
    });

    await expect(
      runHttpCheck({
        ...input,
        transport: createTransport([
          new Error("This operation was aborted"),
          new Error("This operation was aborted"),
        ]),
      }),
    ).resolves.toMatchObject({
      status: "failed",
      errorMessage: "Request timed out.",
    });
  });
});

function createTransport(
  results: Array<Awaited<ReturnType<WorkflowHttpTransport>> | Error | string>,
) {
  return vi.fn<WorkflowHttpTransport>(async () => {
    const result = results.shift();

    if (result instanceof Error || typeof result === "string") {
      throw result;
    }

    if (!result) {
      throw new Error("No mocked transport result configured.");
    }

    return result;
  });
}
