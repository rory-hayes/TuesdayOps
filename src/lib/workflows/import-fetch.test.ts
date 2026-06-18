import { describe, expect, it, vi } from "vitest";
import { fetchOpenApiDocument, fetchOpenApiImportPlan } from "./import-fetch";

describe("OpenAPI import fetch safety", () => {
  it("blocks unsafe DNS resolution before fetching remote OpenAPI documents", async () => {
    const transport = vi.fn();

    await expect(
      fetchOpenApiDocument("https://metadata-proxy.example.com/openapi.json", {
        validateEndpoint: async () => {
          throw new Error("Private or local workflow endpoints are blocked in production.");
        },
        transport,
      }),
    ).rejects.toThrow("Private or local workflow endpoints are blocked in production.");

    expect(transport).not.toHaveBeenCalled();
  });

  it("uses the validated pinned address when fetching remote OpenAPI documents", async () => {
    const transport = vi.fn(async () => ({
      statusCode: 200,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: JSON.stringify({
        servers: [{ url: "https://api.example.com" }],
        paths: {
          "/health": {
            get: { operationId: "healthCheck" },
          },
        },
      }),
      truncated: false,
    }));

    await expect(
      fetchOpenApiImportPlan({
        url: "https://docs.example.com/openapi.json",
        fetcher: (url) =>
          fetchOpenApiDocument(url, {
            validateEndpoint: async (value) => ({
              endpointUrl: value,
              url: new URL(value),
              resolvedAddress: "93.184.216.34",
            }),
            transport,
          }),
      }),
    ).resolves.toMatchObject({
      name: "healthCheck",
      endpointUrl: "https://api.example.com/health",
      method: "GET",
    });

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: expect.objectContaining({
          endpointUrl: "https://docs.example.com/openapi.json",
          resolvedAddress: "93.184.216.34",
        }),
      }),
    );
  });

  it("does not follow redirects while importing remote OpenAPI documents", async () => {
    await expect(
      fetchOpenApiImportPlan({
        url: "https://docs.example.com/openapi.json",
        fetcher: async () => ({
          ok: false,
          statusCode: 302,
          headers: new Headers({ location: "http://169.254.169.254/latest/meta-data" }),
          text: async () => "",
        }),
      }),
    ).rejects.toThrow("OpenAPI URL returned a redirect. Redirects are blocked for import safety.");
  });
});
