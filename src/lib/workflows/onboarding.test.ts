import { describe, expect, it } from "vitest";
import {
  WORKFLOW_ONBOARDING_TEMPLATES,
  buildWorkflowImportSnapshot,
  maskWorkflowImportSecrets,
  parseWorkflowImport,
} from "./onboarding";
import { fetchOpenApiImportPlan } from "./import-fetch";

describe("parseWorkflowImport", () => {
  it("turns a direct URL into a default health-check workflow plan", () => {
    expect(parseWorkflowImport({
      source: "url",
      text: "https://api.example.com/health",
    })).toMatchObject({
      name: "api.example.com health",
      type: "http_endpoint",
      sourceType: "url",
      endpointUrl: "https://api.example.com/health",
      method: "GET",
      authType: "none",
      checkFrequencyMinutes: 60,
      expectedStatus: 200,
      maxLatencyMs: 5000,
      requestBody: undefined,
      checkEnabled: true,
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

  it("keeps simple cURL imports calm when optional flags are missing or malformed", () => {
    expect(parseWorkflowImport({
      source: "curl",
      text: "curl   -H invalid-header https://api.example.com/status",
    })).toMatchObject({
      name: "api.example.com status",
      type: "webhook",
      endpointUrl: "https://api.example.com/status",
      method: "GET",
      authType: "none",
      requestBody: undefined,
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

  it("falls back through OpenAPI parsing for array-shaped or invalid non-object text", () => {
    expect(() =>
      parseWorkflowImport({
        source: "openapi",
        text: "[1]",
      }),
    ).toThrow("OpenAPI import must include at least one supported operation.");

    expect(() =>
      parseWorkflowImport({
        source: "openapi",
        text: "not valid json",
      }),
    ).toThrow("OpenAPI import must be valid JSON.");
  });

  it("ignores blank and non-operation OpenAPI YAML lines", () => {
    expect(parseWorkflowImport({
      source: "openapi",
      text: `
openapi: 3.1.0

servers:
  - url: https://api.example.com
paths:
  /health:
    description: ignored path metadata
    get:
      description: ignored operation metadata
      operationId: healthCheck
`,
    })).toMatchObject({
      name: "healthCheck",
      endpointUrl: "https://api.example.com/health",
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

  it("maps an n8n webhook workflow JSON into a maintenance plan", () => {
    const plan = parseWorkflowImport({
      source: "n8n_json",
      text: JSON.stringify({
        name: "Lead intake n8n",
        nodes: [
          {
            name: "Lead webhook",
            type: "n8n-nodes-base.webhook",
            parameters: {
              httpMethod: "POST",
              productionUrl: "https://hooks.example.com/n8n/lead",
            },
          },
          { name: "OpenAI classify", type: "@n8n/n8n-nodes-langchain.openAi" },
          { name: "HubSpot", type: "n8n-nodes-base.hubspot" },
        ],
        connections: {},
      }),
    });

    expect(plan).toMatchObject({
      name: "Lead intake n8n",
      type: "n8n",
      sourceType: "n8n_json",
      endpointUrl: "https://hooks.example.com/n8n/lead",
      method: "POST",
      checkEnabled: true,
      maintenanceMap: {
        sourcePlatform: "n8n",
        triggerType: "webhook",
        detectedEndpointUrl: "https://hooks.example.com/n8n/lead",
        requiresManualEndpoint: false,
      },
    });
    expect(plan.maintenanceMap.detectedApps).toContain("hubspot");
    expect(plan.maintenanceMap.suggestedChecks).toContain("AI prompt/model regression check");
  });

  it("maps an n8n schedule-only workflow to a disabled heartbeat setup check", () => {
    const plan = parseWorkflowImport({
      source: "n8n_json",
      text: JSON.stringify({
        name: "Daily cleanup",
        nodes: [{ name: "Every day", type: "n8n-nodes-base.scheduleTrigger" }],
      }),
    });

    expect(plan).toMatchObject({
      type: "n8n",
      endpointUrl: "https://maintainflow.io/api/public/run-log",
      checkEnabled: false,
      maintenanceMap: {
        triggerType: "schedule",
        requiresManualEndpoint: true,
      },
    });
    expect(plan.maintenanceMap.suggestedChecks).toContain("Schedule freshness check");
  });

  it("maps a Make blueprint with webhook and router modules", () => {
    const plan = parseWorkflowImport({
      source: "make_blueprint",
      text: JSON.stringify({
        name: "Lead intake scenario",
        flow: [
          {
            id: 1,
            module: "gateway:CustomWebHook",
            parameters: { url: "https://hooks.example.com/make/lead" },
          },
          { id: 2, module: "builtin:Router" },
          { id: 3, module: "openai-gpt-3:CreateCompletion" },
        ],
      }),
    });

    expect(plan).toMatchObject({
      name: "Lead intake scenario",
      type: "make",
      sourceType: "make_blueprint",
      endpointUrl: "https://hooks.example.com/make/lead",
      checkEnabled: true,
      maintenanceMap: {
        sourcePlatform: "make",
        triggerType: "webhook",
      },
    });
    expect(plan.maintenanceMap.warnings.join(" ")).toContain("Make blueprints do not reconnect");
    expect(plan.maintenanceMap.suggestedChecks).toContain("AI prompt/model regression check");
  });

  it("rejects oversized Make blueprints and invalid platform JSON", () => {
    expect(() =>
      parseWorkflowImport({
        source: "make_blueprint",
        text: "x".repeat(200_001),
      }),
    ).toThrow("Make blueprint is too large for quick import.");

    expect(() =>
      parseWorkflowImport({
        source: "n8n_json",
        text: "{not-json",
      }),
    ).toThrow("n8n workflow JSON import must be valid JSON.");
  });

  it("maps Zapier export JSON and snapshots without storing raw secrets", () => {
    const plan = parseWorkflowImport({
      source: "zapier_json",
      text: JSON.stringify({
        zaps: [
          {
            title: "Lead intake Zap",
            steps: [
              { type: "trigger", app: { name: "Webhooks by Zapier" }, url: "https://hooks.zapier.com/hooks/catch/123/abc" },
              { type: "action", app: { name: "OpenAI" }, authentication: { token: "secret-token" } },
            ],
          },
        ],
      }),
    });

    expect(plan).toMatchObject({
      name: "Lead intake Zap",
      type: "zapier",
      sourceType: "zapier_json",
      endpointUrl: "https://hooks.zapier.com/hooks/catch/123/abc",
      checkEnabled: true,
      maintenanceMap: {
        sourcePlatform: "zapier",
        triggerType: "webhook",
      },
    });
    expect(plan.maintenanceMap.warnings.join(" ")).toContain("Potential credentials");

    const snapshot = buildWorkflowImportSnapshot(plan);

    expect(JSON.stringify(snapshot)).not.toContain("secret-token");
    expect(snapshot.detectedApps).toContain("OpenAI");
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

  it("tolerates incomplete optional Postman fields while preserving URL shape", () => {
    expect(
      parseWorkflowImport({
        source: "postman",
        text: JSON.stringify({
          item: [
            {
              request: {
                url: {
                  host: ["status", "example", "com"],
                  path: [],
                },
                header: [{}, { key: " ", value: " " }],
              },
            },
          ],
        }),
      }),
    ).toMatchObject({
      name: "status.example.com",
      endpointUrl: "https://status.example.com",
      method: "GET",
      authType: "none",
    });
  });
});
