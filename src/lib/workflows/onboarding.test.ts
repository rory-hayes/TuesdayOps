import { describe, expect, it } from "vitest";
import {
  WORKFLOW_ONBOARDING_TEMPLATES,
  parseWorkflowImport,
} from "./onboarding";

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
});
