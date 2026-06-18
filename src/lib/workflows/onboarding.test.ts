import { describe, expect, it } from "vitest";
import {
  WORKFLOW_ONBOARDING_TEMPLATES,
  maskWorkflowImportSecrets,
  parseWorkflowImport,
} from "./onboarding";
import { fetchOpenApiImportPlan } from "./import-fetch";

describe("parseWorkflowImport", () => {
  it("turns a direct URL into a default health-check workflow plan", () => {
    expect(parseWorkflowImport({
      source: "url",
      text: "https://api.example.com/health",
    })).toEqual({
      name: "api.example.com health",
      type: "http_endpoint",
      endpointUrl: "https://api.example.com/health",
      method: "GET",
      authType: "none",
      checkFrequencyMinutes: 60,
      expectedStatus: 200,
      maxLatencyMs: 5000,
      requestBody: undefined,
    });
  });

  it("preserves direct URLs with no path and rejects non-http endpoints", () => {
    expect(parseWorkflowImport({
      source: "url",
      text: "https://api.example.com",
    })).toMatchObject({
      name: "api.example.com",
      endpointUrl: "https://api.example.com",
    });
    expect(() =>
      parseWorkflowImport({
        source: "url",
        text: "ftp://api.example.com/file",
      }),
    ).toThrow("Workflow endpoint must be an HTTP or HTTPS URL.");
  });


  it("extracts method, bearer auth, URL, and body from a cURL command", () => {
    expect(parseWorkflowImport({
      source: "curl",
      text: `curl -X POST "https://hooks.example.com/lead" -H "Authorization: Bearer token_123" -H "Content-Type: application/json" -d '{"email":"lead@example.com"}'`,
    })).toMatchObject({
      name: "hooks.example.com lead",
      type: "webhook",
      endpointUrl: "https://hooks.example.com/lead",
      method: "POST",
      authType: "bearer",
      authSecret: "token_123",
      requestBody: '{"email":"lead@example.com"}',
    });
  });

  it("infers POST and API-key auth from cURL data and headers", () => {
    expect(parseWorkflowImport({
      source: "curl",
      text: `curl --header "X-API-Key: secret_123" --data-raw '{"ok":true}' https://api.example.com/webhook`,
    })).toMatchObject({
      type: "webhook",
      endpointUrl: "https://api.example.com/webhook",
      method: "POST",
      authType: "api_key_header",
      authHeaderName: "X-API-Key",
      authSecret: "secret_123",
      requestBody: '{"ok":true}',
    });
  });

  it("masks cURL import secrets for shoulder-surfing safety", () => {
    const masked = maskWorkflowImportSecrets(
      `curl -X POST "https://hooks.example.com/lead" -H "Authorization: Bearer token_123" -H "X-API-Key: secret_456" -u "user:password" -d '{"email":"lead@example.com","token":"payload-token"}'`,
    );

    expect(masked).toContain("Authorization: Bearer [redacted]");
    expect(masked).toContain("X-API-Key: [redacted]");
    expect(masked).toContain("-u [redacted]");
    expect(masked).toContain('"token":"[redacted]"');
    expect(masked).not.toContain("token_123");
    expect(masked).not.toContain("secret_456");
    expect(masked).not.toContain("user:password");
    expect(masked).not.toContain("payload-token");
  });


  it("uses the first OpenAPI operation and server URL", () => {
    const openApi = {
      openapi: "3.1.0",
      servers: [{ url: "https://api.example.com/v1" }],
      paths: {
        "/classify": {
          post: {
            operationId: "classifyDocument",
            summary: "Classify a document",
          },
        },
      },
    };

    expect(parseWorkflowImport({
      source: "openapi",
      text: JSON.stringify(openApi),
    })).toMatchObject({
      name: "Classify a document",
      type: "custom_api",
      endpointUrl: "https://api.example.com/v1/classify",
      method: "POST",
      authType: "none",
    });
  });

  it("accepts common OpenAPI YAML text", () => {
    expect(parseWorkflowImport({
      source: "openapi",
      text: `
openapi: 3.1.0
servers:
  - url: https://api.example.com/v2
paths:
  /score:
    post:
      summary: Score a lead
      operationId: scoreLead
`,
    })).toMatchObject({
      name: "Score a lead",
      endpointUrl: "https://api.example.com/v2/score",
      method: "POST",
    });
  });

  it("accepts quoted OpenAPI YAML scalars and root server URL syntax", () => {
    expect(parseWorkflowImport({
      source: "openapi",
      text: `
openapi: "3.1.0"
servers:
  url: "https://api.example.com/root"
paths:
  /classify:
    get:
      operationId: 'classifyDocument'
`,
    })).toMatchObject({
      name: "classifyDocument",
      endpointUrl: "https://api.example.com/root/classify",
      method: "GET",
    });
  });

  it("fetches safe public OpenAPI URLs without allowing private endpoints", async () => {
    const fetcher = async (url: string) => ({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({
        servers: [{ url: "https://api.example.com" }],
        paths: {
          "/health": {
            get: { operationId: "healthCheck" },
          },
        },
      }),
      url,
    });

    await expect(fetchOpenApiImportPlan({
      url: "https://docs.example.com/openapi.json",
      fetcher,
    })).resolves.toMatchObject({
      name: "healthCheck",
      endpointUrl: "https://api.example.com/health",
      method: "GET",
    });

    await expect(fetchOpenApiImportPlan({
      url: "http://127.0.0.1/openapi.json",
      fetcher,
    })).rejects.toThrow("Private or local workflow endpoints are blocked in production.");
  });

  it("rejects unsafe OpenAPI URL fetch responses", async () => {
    await expect(fetchOpenApiImportPlan({
      url: "https://docs.example.com/missing.json",
      fetcher: async () => ({
        ok: false,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => "{}",
      }),
    })).rejects.toThrow("OpenAPI URL could not be fetched.");

    await expect(fetchOpenApiImportPlan({
      url: "https://docs.example.com/openapi.html",
      fetcher: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "{}",
      }),
    })).rejects.toThrow("OpenAPI URL must return JSON or YAML.");

    await expect(fetchOpenApiImportPlan({
      url: "https://docs.example.com/openapi.yaml",
      fetcher: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/yaml" }),
        text: async () => "x".repeat(200_001),
      }),
    })).rejects.toThrow("OpenAPI document is too large for quick import.");
  });

  it("uses the first Postman collection request", () => {
    const collection = {
      info: { name: "Lead intake" },
      item: [
        {
          name: "Create lead",
          request: {
            method: "POST",
            url: { raw: "https://api.example.com/leads" },
            header: [{ key: "x-api-key", value: "secret_123" }],
            body: { raw: '{"name":"Example"}' },
          },
        },
      ],
    };

    expect(parseWorkflowImport({
      source: "postman",
      text: JSON.stringify(collection),
    })).toMatchObject({
      name: "Create lead",
      type: "custom_api",
      endpointUrl: "https://api.example.com/leads",
      method: "POST",
      authType: "api_key_header",
      authHeaderName: "x-api-key",
      authSecret: "secret_123",
      requestBody: '{"name":"Example"}',
    });
  });

  it("exposes agency-friendly templates for common endpoint sources", () => {
    expect(WORKFLOW_ONBOARDING_TEMPLATES.map((template) => template.type)).toEqual([
      "http_endpoint",
      "webhook",
      "n8n",
      "make",
      "zapier",
      "mcp_server",
      "custom_api",
    ]);
  });

  it("rejects empty imports, unsupported cURL methods, and cURL commands without URLs", () => {
    expect(() => parseWorkflowImport({ source: "url", text: "   " })).toThrow(
      "Import details are required.",
    );
    expect(() =>
      parseWorkflowImport({
        source: "curl",
        text: "curl -X DELETE https://api.example.com/lead",
      }),
    ).toThrow("Unsupported workflow method: DELETE");
    expect(() =>
      parseWorkflowImport({
        source: "curl",
        text: "curl -H 'Authorization: Bearer token' --data '{\"ok\":true}'",
      }),
    ).toThrow("A cURL import must include an HTTP URL.");
  });

  it("extracts OpenAPI example bodies and rejects unusable OpenAPI documents", () => {
    expect(
      parseWorkflowImport({
        source: "openapi",
        text: JSON.stringify({
          servers: [{ url: "https://api.example.com" }],
          paths: {
            "/score": {
              put: {
                operationId: "scoreLead",
                requestBody: {
                  content: {
                    "application/json": {
                      example: { leadId: "lead-123" },
                    },
                  },
                },
              },
            },
          },
        }),
      }),
    ).toMatchObject({
      name: "scoreLead",
      endpointUrl: "https://api.example.com/score",
      method: "PUT",
      requestBody: '{"leadId":"lead-123"}',
    });

    expect(
      parseWorkflowImport({
        source: "openapi",
        text: JSON.stringify({
          paths: {
            "https://api.example.com/absolute": {
              patch: {
                summary: "",
                operationId: "absolutePatch",
                requestBody: {
                  content: {
                    "application/json": {
                      example: "{\"ok\":true}",
                    },
                  },
                },
              },
            },
          },
        }),
      }),
    ).toMatchObject({
      name: "absolutePatch",
      endpointUrl: "https://api.example.com/absolute",
      method: "PATCH",
      requestBody: "{\"ok\":true}",
    });

    expect(() =>
      parseWorkflowImport({
        source: "openapi",
        text: "{not-json",
      }),
    ).toThrow("OpenAPI import must be valid JSON.");
    expect(() =>
      parseWorkflowImport({
        source: "openapi",
        text: JSON.stringify({ paths: { "/relative": { get: {} } } }),
      }),
    ).toThrow("OpenAPI import must include at least one supported operation.");
    expect(() =>
      parseWorkflowImport({
        source: "openapi",
        text: JSON.stringify({ paths: { "/relative": { get: { operationId: "relativeGet" } } } }),
      }),
    ).toThrow("OpenAPI import needs a server URL when paths are relative.");
  });

  it("finds nested Postman requests and builds URLs from structured parts", () => {
    expect(
      parseWorkflowImport({
        source: "postman",
        text: JSON.stringify({
          item: [
            {
              name: "Folder",
              item: [
                {
                  name: "Nested health",
                  request: {
                    method: "GET",
                    url: {
                      protocol: "https",
                      host: ["api", "example", "com"],
                      path: ["health"],
                    },
                    header: [{ key: "Authorization", value: "Bearer postman-token" }],
                  },
                },
              ],
            },
          ],
        }),
      }),
    ).toMatchObject({
      name: "Nested health",
      endpointUrl: "https://api.example.com/health",
      method: "GET",
      authType: "bearer",
      authSecret: "postman-token",
    });

    expect(() =>
      parseWorkflowImport({
        source: "postman",
        text: JSON.stringify({ item: [{ name: "No request" }] }),
      }),
    ).toThrow("Postman collection must include at least one request.");
  });

  it("uses Postman request defaults and rejects unsupported Postman methods", () => {
    expect(
      parseWorkflowImport({
        source: "postman",
        text: JSON.stringify({
          item: [
            {
              request: {
                url: "https://api.example.com/status",
                header: [{ key: "Content-Type", value: "application/json" }],
              },
            },
          ],
        }),
      }),
    ).toMatchObject({
      name: "api.example.com status",
      method: "GET",
      authType: "none",
      requestBody: undefined,
    });

    expect(() =>
      parseWorkflowImport({
        source: "postman",
        text: JSON.stringify({
          item: [
            {
              request: {
                method: "DELETE",
                url: "https://api.example.com/status",
              },
            },
          ],
        }),
      }),
    ).toThrow("Unsupported workflow method: DELETE");
  });
});
