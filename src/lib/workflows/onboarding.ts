import type { Workflow } from "@/lib/domain/types";

export type WorkflowImportSource = "url" | "curl" | "openapi" | "postman";

export type WorkflowOnboardingTemplate = {
  type: Workflow["type"];
  label: string;
  detail: string;
  defaultMethod: Workflow["method"];
  defaultFrequencyMinutes: number;
};

export type WorkflowImportPlan = {
  name: string;
  type: Workflow["type"];
  endpointUrl: string;
  method: Workflow["method"];
  authType: Workflow["authType"];
  authHeaderName?: string;
  authSecret?: string;
  requestBody?: string;
  checkFrequencyMinutes: number;
  expectedStatus: number;
  maxLatencyMs: number;
};

export const WORKFLOW_ONBOARDING_TEMPLATES: WorkflowOnboardingTemplate[] = [
  {
    type: "http_endpoint",
    label: "HTTP endpoint",
    detail: "Health or status endpoint returning a 2xx response.",
    defaultMethod: "GET",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "webhook",
    label: "Webhook",
    detail: "A callable endpoint from an automation or agent workflow.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "n8n",
    label: "n8n",
    detail: "Production webhook URL from an n8n workflow.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "make",
    label: "Make",
    detail: "Custom webhook URL from a Make scenario.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "zapier",
    label: "Zapier",
    detail: "Catch hook or callable Zap endpoint.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "mcp_server",
    label: "MCP server",
    detail: "HTTP-accessible health endpoint for an MCP server.",
    defaultMethod: "GET",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "custom_api",
    label: "Custom API",
    detail: "Any API route that can be checked with HTTP assertions.",
    defaultMethod: "GET",
    defaultFrequencyMinutes: 60,
  },
];

const validMethods = ["GET", "POST", "PUT", "PATCH"] as const;

export function parseWorkflowImport({
  source,
  text,
}: {
  source: WorkflowImportSource;
  text: string;
}): WorkflowImportPlan {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Import details are required.");
  }

  if (source === "url") {
    return withDefaults({
      endpointUrl: normalizeUrl(trimmed),
      method: "GET",
      type: "http_endpoint",
      authType: "none",
    });
  }

  if (source === "curl") {
    return parseCurlImport(trimmed);
  }

  if (source === "openapi") {
    return parseOpenApiImport(trimmed);
  }

  return parsePostmanImport(trimmed);
}

export function maskWorkflowImportSecrets(text: string): string {
  return text
    .replace(/(Authorization\s*:\s*Bearer\s+)([^"'\s]+)/gi, "$1[redacted]")
    .replace(/((?:X[-_])?API[-_]?Key\s*:\s*)([^"'\s]+)/gi, "$1[redacted]")
    .replace(/(-u|--user)\s+("[^"]*"|'[^']*'|\S+)/gi, "$1 [redacted]")
    .replace(
      /(["'](?:api[_-]?key|token|secret|password)["']\s*:\s*)(["'][^"']*["']|[^,}\s]+)/gi,
      '$1"[redacted]"',
    );
}

function parseCurlImport(command: string): WorkflowImportPlan {
  const tokens = tokenizeCommand(command);
  let endpointUrl = "";
  let method: Workflow["method"] | undefined;
  let requestBody: string | undefined;
  const headers: Array<{ key: string; value: string }> = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];

    if ((token === "-X" || token === "--request") && next) {
      method = parseMethod(next);
      index += 1;
      continue;
    }

    if ((token === "-H" || token === "--header") && next) {
      const header = parseHeader(next);
      if (header) {
        headers.push(header);
      }
      index += 1;
      continue;
    }

    if ((token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") && next) {
      requestBody = next;
      method ??= "POST";
      index += 1;
      continue;
    }

    if (!endpointUrl && isHttpUrl(token)) {
      endpointUrl = normalizeUrl(token);
    }
  }

  if (!endpointUrl) {
    throw new Error("A cURL import must include an HTTP URL.");
  }

  return withDefaults({
    endpointUrl,
    method: method ?? (requestBody ? "POST" : "GET"),
    type: inferWorkflowType(endpointUrl, "webhook"),
    requestBody,
    ...inferAuth(headers),
  });
}

function parseOpenApiImport(text: string): WorkflowImportPlan {
  const document = parseJsonObject(text, "OpenAPI");
  const paths = readRecord(document.paths);
  const serverUrl = readString(readArray(document.servers)[0]?.url) ?? "";

  for (const [path, pathItem] of Object.entries(paths)) {
    const operations = readRecord(pathItem);

    for (const method of validMethods) {
      const operation = readRecord(operations[method.toLowerCase()]);

      if (!Object.keys(operation).length) {
        continue;
      }

      const endpointUrl = normalizeUrl(joinUrl(serverUrl, path));
      const operationName =
        readString(operation.summary) ??
        readString(operation.operationId) ??
        buildNameFromUrl(endpointUrl);

      return withDefaults({
        name: operationName,
        endpointUrl,
        method,
        type: "custom_api",
        authType: "none",
        requestBody: extractOpenApiExampleBody(operation),
      });
    }
  }

  throw new Error("OpenAPI import must include at least one supported operation.");
}

function parsePostmanImport(text: string): WorkflowImportPlan {
  const collection = parseJsonObject(text, "Postman collection");
  const item = findFirstPostmanRequest(readArray(collection.item));

  if (!item) {
    throw new Error("Postman collection must include at least one request.");
  }

  const request = readRecord(item.request);
  const endpointUrl = normalizeUrl(readPostmanUrl(request.url));
  const method = parseMethod(readString(request.method) ?? "GET");
  const headers = readArray(request.header)
    .map((header) => readRecord(header))
    .map((header) => ({
      key: readString(header.key) ?? "",
      value: readString(header.value) ?? "",
    }))
    .filter((header) => header.key && header.value);
  const body = readRecord(request.body);

  return withDefaults({
    name: readString(item.name) ?? buildNameFromUrl(endpointUrl),
    endpointUrl,
    method,
    type: "custom_api",
    requestBody: readString(body.raw),
    ...inferAuth(headers),
  });
}

function withDefaults(
  input: Partial<WorkflowImportPlan> & Pick<WorkflowImportPlan, "endpointUrl" | "method" | "type">,
): WorkflowImportPlan {
  return {
    name: input.name ?? buildNameFromUrl(input.endpointUrl),
    type: input.type,
    endpointUrl: input.endpointUrl,
    method: input.method,
    authType: input.authType ?? "none",
    authHeaderName: input.authHeaderName,
    authSecret: input.authSecret,
    requestBody: input.requestBody,
    checkFrequencyMinutes: input.checkFrequencyMinutes ?? 60,
    expectedStatus: input.expectedStatus ?? 200,
    maxLatencyMs: input.maxLatencyMs ?? 5000,
  };
}

function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const char of command.trim()) {
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens.filter((token) => token !== "curl");
}

function parseHeader(value: string): { key: string; value: string } | null {
  const separatorIndex = value.indexOf(":");

  if (separatorIndex < 1) {
    return null;
  }

  return {
    key: value.slice(0, separatorIndex).trim(),
    value: value.slice(separatorIndex + 1).trim(),
  };
}

function inferAuth(headers: Array<{ key: string; value: string }>): Pick<
  WorkflowImportPlan,
  "authType" | "authHeaderName" | "authSecret"
> {
  const authorization = headers.find((header) => header.key.toLowerCase() === "authorization");

  if (authorization?.value.toLowerCase().startsWith("bearer ")) {
    return {
      authType: "bearer",
      authSecret: authorization.value.slice("bearer ".length).trim(),
    };
  }

  const apiKey = headers.find((header) => /api[-_]?key|x-api-key/i.test(header.key));

  if (apiKey) {
    return {
      authType: "api_key_header",
      authHeaderName: apiKey.key,
      authSecret: apiKey.value,
    };
  }

  return { authType: "none" };
}

function parseMethod(value: string): Workflow["method"] {
  const method = value.toUpperCase();

  if (validMethods.includes(method as Workflow["method"])) {
    return method as Workflow["method"];
  }

  throw new Error(`Unsupported workflow method: ${value}`);
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  try {
    return readRecord(JSON.parse(text));
  } catch {
    throw new Error(`${label} import must be valid JSON.`);
  }
}

function findFirstPostmanRequest(items: unknown[]): Record<string, unknown> | null {
  for (const item of items) {
    const record = readRecord(item);

    if (record.request) {
      return record;
    }

    const nested = findFirstPostmanRequest(readArray(record.item));

    if (nested) {
      return nested;
    }
  }

  return null;
}

function readPostmanUrl(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  const url = readRecord(value);
  const raw = readString(url.raw);

  if (raw) {
    return raw;
  }

  const protocol = readString(url.protocol) ?? "https";
  const host = readArray(url.host).map((part) => String(part)).join(".");
  const path = readArray(url.path).map((part) => String(part)).join("/");

  return `${protocol}://${host}${path ? `/${path}` : ""}`;
}

function extractOpenApiExampleBody(operation: Record<string, unknown>): string | undefined {
  const requestBody = readRecord(operation.requestBody);
  const content = readRecord(requestBody.content);
  const jsonContent = readRecord(content["application/json"]);
  const example = jsonContent.example;

  if (example === undefined) {
    return undefined;
  }

  return typeof example === "string" ? example : JSON.stringify(example);
}

function inferWorkflowType(endpointUrl: string, fallback: Workflow["type"]): Workflow["type"] {
  const value = endpointUrl.toLowerCase();

  if (value.includes("webhook") || value.includes("hooks.")) {
    return "webhook";
  }

  return fallback;
}

function buildNameFromUrl(endpointUrl: string): string {
  const url = new URL(endpointUrl);
  const pathName = url.pathname.split("/").filter(Boolean).at(-1);

  return [url.hostname, pathName].filter(Boolean).join(" ");
}

function joinUrl(base: string, path: string): string {
  if (isHttpUrl(path)) {
    return path;
  }

  if (!base) {
    throw new Error("OpenAPI import needs a server URL when paths are relative.");
  }

  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function normalizeUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Workflow endpoint must be an HTTP or HTTPS URL.");
  }

  return url.toString();
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
