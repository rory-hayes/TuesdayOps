import http from "node:http";
import https from "node:https";
import type { CheckRunStatus } from "@/lib/domain/types";
import { shouldAllowPrivateWorkflowEndpoints } from "@/lib/security/endpoint-url";
import { resolveSafeWorkflowEndpoint } from "@/lib/security/endpoint-url-server";
import {
  checkConfigSchema,
  evaluateAssertions,
  type AssertionResult,
  type CheckConfig,
} from "./assertions";

export type WorkflowAuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "api_key_header"; headerName: string; value: string }
  | { type: "basic"; username: string; password: string };

export type RunnableWorkflow = {
  endpointUrl: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  authType: "none" | "bearer" | "api_key_header" | "basic";
};

export type RunnableCheck = {
  configJson: unknown;
};

export type HttpCheckResult = {
  status: CheckRunStatus;
  statusCode?: number;
  latencyMs: number;
  responseSummary: string;
  assertionResults: AssertionResult[];
  errorMessage?: string;
  startedAt: string;
  completedAt: string;
};

type ResolvedWorkflowEndpoint = Awaited<ReturnType<typeof resolveSafeWorkflowEndpoint>>;

type WorkflowHttpTransportInput = {
  endpoint: ResolvedWorkflowEndpoint;
  workflow: RunnableWorkflow;
  headers: Headers;
  config: CheckConfig;
  signal: AbortSignal;
};

export type WorkflowHttpTransport = (input: WorkflowHttpTransportInput) => Promise<{
  statusCode: number;
  bodyText: string;
  truncated: boolean;
}>;

const maxResponseBodyBytes = 64_000;
const maxResponseSummaryChars = 600;
const maxRequestAttempts = 2;
const redirectBlockedMessage = "Workflow endpoint returned a redirect. Redirects are blocked for check safety.";

export async function runHttpCheck({
  workflow,
  check,
  authConfig,
  transport = sendPinnedWorkflowRequest,
  maxTimeoutMs,
  maxAttempts = maxRequestAttempts,
}: {
  workflow: RunnableWorkflow;
  check: RunnableCheck;
  authConfig?: WorkflowAuthConfig;
  transport?: WorkflowHttpTransport;
  maxTimeoutMs?: number;
  maxAttempts?: number;
}): Promise<HttpCheckResult> {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  let config: CheckConfig | null = null;

  try {
    config = applyRuntimeLimits(parseCheckConfig(check.configJson), { maxTimeoutMs });
    const headers = buildHeaders(workflow.authType, authConfig);
    const endpoint = await resolveSafeWorkflowEndpoint(workflow.endpointUrl, {
      allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
    });

    const requestAttempts = Math.max(1, maxAttempts);

    for (let attempt = 1; attempt <= requestAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await transport({
          endpoint,
          workflow,
          headers,
          config,
          signal: controller.signal,
        });
        const latencyMs = Date.now() - startedAtDate.getTime();

        if (isRedirectStatus(response.statusCode)) {
          return {
            status: "failed",
            statusCode: response.statusCode,
            latencyMs,
            responseSummary: "Redirect blocked for workflow check safety.",
            assertionResults: config.assertions.map((assertion) => ({
              type: assertion.type,
              passed: false,
              message: redirectBlockedMessage,
            })),
            errorMessage: redirectBlockedMessage,
            startedAt,
            completedAt: new Date().toISOString(),
          };
        }

        const { bodyText, truncated } = response;
        const bodyJson = parseJson(bodyText);
        const assertionResults = evaluateAssertions(config.assertions, {
          statusCode: response.statusCode,
          latencyMs,
          bodyText,
          bodyJson,
        });
        const status = deriveCheckRunStatus(assertionResults);

        return {
          status,
          statusCode: response.statusCode,
          latencyMs,
          responseSummary: summarizeResponse(bodyText, { truncated }),
          assertionResults,
          startedAt,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (attempt === requestAttempts) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error("Request did not complete after retry.");
  } catch (error) {
    return buildFailedHttpCheckResult({ error, config, startedAtDate, startedAt });
  }
}

function parseCheckConfig(value: unknown): CheckConfig {
  const parsed = checkConfigSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error("Check configuration is invalid.");
  }

  return parsed.data;
}

function applyRuntimeLimits(config: CheckConfig, { maxTimeoutMs }: { maxTimeoutMs?: number }): CheckConfig {
  if (!maxTimeoutMs) {
    return config;
  }

  return {
    ...config,
    timeoutMs: Math.min(config.timeoutMs, Math.max(1000, maxTimeoutMs)),
  };
}

function buildHeaders(
  workflowAuthType: RunnableWorkflow["authType"],
  authConfig?: WorkflowAuthConfig,
): Headers {
  const headers = new Headers({
    accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  });

  if (!authConfig || authConfig.type === "none" || authConfig.type !== workflowAuthType) {
    return headers;
  }

  if (authConfig.type === "bearer") {
    headers.set("authorization", `Bearer ${authConfig.token}`);
  }

  if (authConfig.type === "api_key_header") {
    headers.set(authConfig.headerName, authConfig.value);
  }

  if (authConfig.type === "basic") {
    const encoded = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString("base64");
    headers.set("authorization", `Basic ${encoded}`);
  }

  return headers;
}

function buildFailedHttpCheckResult({
  error,
  config,
  startedAtDate,
  startedAt,
}: {
  error: unknown;
  config: CheckConfig | null;
  startedAtDate: Date;
  startedAt: string;
}): HttpCheckResult {
  const message = formatCheckRunnerError(error);

  return {
    status: "failed",
    latencyMs: Date.now() - startedAtDate.getTime(),
    responseSummary: "",
    assertionResults: config
      ? config.assertions.map((assertion) => ({
          type: assertion.type,
          passed: false,
          message: "Request did not complete, so this assertion could not be evaluated.",
        }))
      : [],
    errorMessage: message,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

function formatCheckRunnerError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown check runner error.";
  const normalized = /operation was aborted|this operation was aborted/i.test(message)
    ? "Request timed out."
    : message;

  return normalized
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]")
    .slice(0, 400);
}

async function sendPinnedWorkflowRequest({
  endpoint,
  workflow,
  headers,
  config,
  signal,
}: WorkflowHttpTransportInput): Promise<{
  statusCode: number;
  bodyText: string;
  truncated: boolean;
}> {
  const requestHeaders = new Headers(headers);
  const requestBody = workflow.method !== "GET" ? config.requestBody : undefined;

  if (requestBody && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  requestHeaders.set("host", endpoint.url.host);

  return new Promise((resolve, reject) => {
    let settled = false;
    const request = (endpoint.url.protocol === "https:" ? https : http).request(
      {
        protocol: endpoint.url.protocol,
        hostname: endpoint.resolvedAddress,
        port: endpoint.url.port || (endpoint.url.protocol === "https:" ? 443 : 80),
        path: `${endpoint.url.pathname}${endpoint.url.search}`,
        method: workflow.method,
        headers: Object.fromEntries(requestHeaders.entries()),
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
          const remaining = maxResponseBodyBytes - bytesRead;

          if (buffer.byteLength > remaining) {
            if (remaining > 0) {
              chunks.push(buffer.subarray(0, remaining));
            }
            bytesRead = maxResponseBodyBytes;
            settled = true;
            response.destroy();
            resolve({
              statusCode: response.statusCode ?? 0,
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

    if (requestBody) {
      request.write(requestBody);
    }

    request.end();
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRedirectStatus(statusCode: number): boolean {
  return statusCode >= 300 && statusCode <= 399;
}

function deriveCheckRunStatus(assertionResults: AssertionResult[]): CheckRunStatus {
  const failedAssertions = assertionResults.filter((result) => !result.passed);

  if (!failedAssertions.length) {
    return "healthy";
  }

  if (failedAssertions.some((result) => result.type === "status_code")) {
    return "failed";
  }

  return "degraded";
}

function summarizeResponse(value: string, options: { truncated?: boolean } = {}): string {
  const summary = normalizeResponseForSummary(value)
    .slice(0, maxResponseSummaryChars)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/"?(api[_-]?key|token|secret|password)"?\s*[:=]\s*"[^"]+"/gi, '"$1":"[redacted]"');

  if (!options.truncated) {
    return summary;
  }

  const marker = " [truncated]";
  return `${summary.slice(0, maxResponseSummaryChars - marker.length)}${marker}`;
}

function normalizeResponseForSummary(value: string): string {
  if (!looksLikeHtml(value)) {
    return value;
  }

  const text = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text || "HTML response received.";
}

function looksLikeHtml(value: string): boolean {
  return /<!doctype\s+html|<html\b|<head\b|<body\b|<\/[a-z][\w:-]*>/i.test(value);
}
