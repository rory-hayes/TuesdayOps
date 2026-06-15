import { afterEach, describe, expect, it, vi } from "vitest";
import { runHttpCheck } from "./runner";

const originalFetch = globalThis.fetch;

describe("runHttpCheck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it("does not automatically follow workflow endpoint redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("", {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

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
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/health",
      expect.objectContaining({ redirect: "manual" }),
    );
    expect(result).toMatchObject({
      status: "failed",
      statusCode: 302,
      errorMessage: "Workflow endpoint returned a redirect. Redirects are blocked for check safety.",
      responseSummary: "Redirect blocked for workflow check safety.",
    });
  });

  it("marks response summaries as truncated when the body exceeds the retained limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("x".repeat(70_000), { status: 200 })),
    );

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
    });

    expect(result.status).toBe("healthy");
    expect(result.responseSummary).toContain("[truncated]");
    expect(result.responseSummary.length).toBeLessThanOrEqual(640);
  });

  it("handles successful responses with no readable body stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

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
    });

    expect(result).toMatchObject({
      status: "healthy",
      statusCode: 204,
      responseSummary: "",
    });
  });


  it("sends POST bodies with JSON content type and redacts response summaries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          email: "patient@example.com",
          token: "secret-token",
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

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
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit).toMatchObject({
      method: "POST",
      body: '{"ping":true}',
    });
    expect((requestInit.headers as Headers).get("authorization")).toBe("Bearer workflow-token");
    expect((requestInit.headers as Headers).get("content-type")).toBe("application/json");
    expect(result.status).toBe("healthy");
    expect(result.responseSummary).toContain("[redacted-email]");
    expect(result.responseSummary).toContain('"token":"[redacted]"');
  });

  it("collapses HTML error pages into readable response summaries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<!doctype html><html><head><title>404: Not Found</title><style>body{}</style><script>window.__secret = "token";</script></head><body><h1>404</h1><p>This page could not be found.</p></body></html>`,
          { status: 404 },
        ),
      ),
    );

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
    });

    expect(result.status).toBe("failed");
    expect(result.responseSummary).toBe("404: Not Found 404 This page could not be found.");
    expect(result.responseSummary).not.toContain("<html");
    expect(result.responseSummary).not.toContain("window.__secret");
  });

  it("uses a safe placeholder for empty HTML responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><script>console.log('only script')</script></html>", { status: 500 }),
      ),
    );

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
    });

    expect(result.responseSummary).toBe("HTML response received.");
  });

  it("supports API key and basic auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

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
    });

    expect((fetchMock.mock.calls[0][1].headers as Headers).get("x-api-key")).toBe("key-123");

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
    });

    expect((fetchMock.mock.calls[1][1].headers as Headers).get("authorization")).toBe(
      `Basic ${Buffer.from("user:pass").toString("base64")}`,
    );
  });

  it("records request failures as failed checks with unevaluated assertions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    );

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
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce("network failed")
      .mockRejectedValueOnce(new Error("This operation was aborted"));
    vi.stubGlobal("fetch", fetchMock);
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

    await expect(runHttpCheck(input)).resolves.toMatchObject({
      status: "failed",
      errorMessage: "Unknown check runner error.",
    });
    await expect(runHttpCheck(input)).resolves.toMatchObject({
      status: "failed",
      errorMessage: "Request timed out.",
    });
  });
});
