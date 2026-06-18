import http from "node:http";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import { assertSafeWorkflowEndpoint } from "@/lib/security/endpoint-url";
import { resolveSafeWorkflowEndpoint } from "@/lib/security/endpoint-url-server";
import { parseWorkflowImport, type WorkflowImportPlan } from "@/lib/workflows/onboarding";

type ResolvedWorkflowEndpoint = Awaited<ReturnType<typeof resolveSafeWorkflowEndpoint>>;

export type OpenApiDocumentResponse = {
  ok: boolean;
  statusCode?: number;
  headers: Headers;
  text: () => Promise<string>;
};

export type OpenApiDocumentTransportInput = {
  endpoint: ResolvedWorkflowEndpoint;
  signal: AbortSignal;
};

export type OpenApiDocumentTransport = (input: OpenApiDocumentTransportInput) => Promise<{
  statusCode: number;
  headers: Headers;
  bodyText: string;
  truncated: boolean;
}>;

const maxOpenApiDocumentBytes = 200_001;
const openApiFetchTimeoutMs = 10_000;
const openApiRedirectBlockedMessage =
  "OpenAPI URL returned a redirect. Redirects are blocked for import safety.";

export async function fetchOpenApiImportPlan({
  url,
  fetcher = fetchOpenApiDocument,
}: {
  url: string;
  fetcher?: (url: string) => Promise<OpenApiDocumentResponse>;
}): Promise<WorkflowImportPlan> {
  const safeUrl = assertSafeWorkflowEndpoint(url, { allowPrivateEndpoints: false });
  const response = await fetcher(safeUrl);

  if (isRedirectStatus(response.statusCode ?? 0)) {
    throw new Error(openApiRedirectBlockedMessage);
  }

  if (!response.ok) {
    throw new Error("OpenAPI URL could not be fetched.");
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType && !/json|ya?ml|text\/plain/i.test(contentType)) {
    throw new Error("OpenAPI URL must return JSON or YAML.");
  }

  const body = await response.text();

  if (body.length > 200_000) {
    throw new Error("OpenAPI document is too large for quick import.");
  }

  return parseWorkflowImport({ source: "openapi", text: body });
}

export async function fetchOpenApiDocument(
  url: string,
  {
    validateEndpoint = (value) => resolveSafeWorkflowEndpoint(value, { allowPrivateEndpoints: false }),
    transport = sendPinnedOpenApiDocumentRequest,
  }: {
    validateEndpoint?: (url: string) => Promise<ResolvedWorkflowEndpoint>;
    transport?: OpenApiDocumentTransport;
  } = {},
): Promise<OpenApiDocumentResponse> {
  const endpoint = await validateEndpoint(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), openApiFetchTimeoutMs);

  try {
    const response = await transport({
      endpoint,
      signal: controller.signal,
    });

    return {
      ok: response.statusCode >= 200 && response.statusCode <= 299,
      statusCode: response.statusCode,
      headers: response.headers,
      text: async () => response.bodyText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendPinnedOpenApiDocumentRequest({
  endpoint,
  signal,
}: OpenApiDocumentTransportInput): Promise<{
  statusCode: number;
  headers: Headers;
  bodyText: string;
  truncated: boolean;
}> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = (endpoint.url.protocol === "https:" ? https : http).request(
      {
        protocol: endpoint.url.protocol,
        hostname: endpoint.resolvedAddress,
        port: endpoint.url.port || (endpoint.url.protocol === "https:" ? 443 : 80),
        path: `${endpoint.url.pathname}${endpoint.url.search}`,
        method: "GET",
        headers: {
          accept: "application/json, application/yaml, text/yaml, text/plain;q=0.9",
          host: endpoint.url.host,
        },
        servername: endpoint.url.hostname,
        signal,
      },
      (response) => {
        let bytesRead = 0;
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer | string) => {
          if (settled) {
            return;
          }

          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          const remaining = maxOpenApiDocumentBytes - bytesRead;

          if (buffer.byteLength > remaining) {
            if (remaining > 0) {
              chunks.push(buffer.subarray(0, remaining));
            }
            bytesRead = maxOpenApiDocumentBytes;
            settled = true;
            response.destroy();
            resolve({
              statusCode: response.statusCode ?? 0,
              headers: headersFromNode(response.headers),
              bodyText: Buffer.concat(chunks).toString("utf8"),
              truncated: true,
            });
            return;
          }

          bytesRead += buffer.byteLength;
          chunks.push(buffer);
        });

        response.on("end", () => {
          if (settled) {
            return;
          }

          settled = true;
          resolve({
            statusCode: response.statusCode ?? 0,
            headers: headersFromNode(response.headers),
            bodyText: Buffer.concat(chunks).toString("utf8"),
            truncated: false,
          });
        });
      },
    );

    request.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });

    request.end();
  });
}

function headersFromNode(headers: IncomingHttpHeaders): Headers {
  const output = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    output.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  return output;
}

function isRedirectStatus(statusCode: number): boolean {
  return statusCode >= 300 && statusCode <= 399;
}
