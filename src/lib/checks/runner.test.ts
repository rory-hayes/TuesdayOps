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
});
