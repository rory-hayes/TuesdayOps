import type { CheckRunStatus } from "@/lib/domain/types";
import { shouldAllowPrivateWorkflowEndpoints } from "@/lib/security/endpoint-url";
import { assertResolvedWorkflowEndpointIsSafe } from "@/lib/security/endpoint-url-server";
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

const maxResponseBodyBytes = 64_000;
const maxResponseSummaryChars = 600;
const maxRequestAttempts = 2;
const redirectBlockedMessage = "Workflow endpoint returned a redirect. Redirects are blocked for check safety.";

export async function runHttpCheck({
  workflow,
  check,
  authConfig,
}: {
  workflow: RunnableWorkflow;
  check: RunnableCheck;
  authConfig?: WorkflowAuthConfig;
}): Promise<HttpCheckResult> {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const config = parseCheckConfig(check.configJson);
  const headers = buildHeaders(authConfig);

  try {
    const endpointUrl = await assertResolvedWorkflowEndpointIsSafe(workflow.endpointUrl, {
      allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
    });

    for (let attempt = 1; attempt <= maxRequestAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetch(endpointUrl, buildRequestInit({
          workflow,
          headers,
          config,
          signal: controller.signal,
        }));
        const latencyMs = Date.now() - startedAtDate.getTime();

        if (isRedirectResponse(response)) {
          return {
            status: "failed",
            statusCode: response.status,
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

        const { text: bodyText, truncated } = await readResponseTextWithLimit(response);
        const bodyJson = parseJson(bodyText);
        const assertionResults = evaluateAssertions(config.assertions, {
          statusCode: response.status,
          latencyMs,
          bodyText,
          bodyJson,
        });
        const status = deriveCheckRunStatus(assertionResults);

        return {
          status,
          statusCode: response.status,
          latencyMs,
          responseSummary: summarizeResponse(bodyText, { truncated }),
          assertionResults,
          startedAt,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (attempt === maxRequestAttempts) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error("Request did not complete after retry.");
  } catch (error) {
    const latencyMs = Date.now() - startedAtDate.getTime();
    const message = error instanceof Error ? error.message : "Unknown check runner error.";

    return {
      status: "failed",
      latencyMs,
      responseSummary: "",
      assertionResults: config.assertions.map((assertion) => ({
        type: assertion.type,
        passed: false,
        message: "Request did not complete, so this assertion could not be evaluated.",
      })),
      errorMessage: message === "This operation was aborted" ? "Request timed out." : message,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}

function parseCheckConfig(value: unknown): CheckConfig {
  return checkConfigSchema.parse(value);
}

function buildHeaders(authConfig?: WorkflowAuthConfig): Headers {
  const headers = new Headers({
    accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  });

  if (!authConfig || authConfig.type === "none") {
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

function buildRequestInit({
  workflow,
  headers,
  config,
  signal,
}: {
  workflow: RunnableWorkflow;
  headers: Headers;
  config: CheckConfig;
  signal: AbortSignal;
}): RequestInit {
  const requestHeaders = new Headers(headers);
  const requestInit: RequestInit = {
    method: workflow.method,
    headers: requestHeaders,
    signal,
    redirect: "manual",
  };

  if (workflow.method !== "GET" && config.requestBody) {
    requestInit.body = config.requestBody;
    if (!requestHeaders.has("content-type")) {
      requestHeaders.set("content-type", "application/json");
    }
  }

  return requestInit;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

async function readResponseTextWithLimit(
  response: Response,
  limitBytes = maxResponseBodyBytes,
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    return { text: "", truncated: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      text += decoder.decode();
      break;
    }

    const remaining = limitBytes - bytesRead;

    if (value.byteLength > remaining) {
      text += decoder.decode(value.slice(0, Math.max(remaining, 0)), { stream: true });
      truncated = true;
      await reader.cancel();
      text += decoder.decode();
      break;
    }

    bytesRead += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }

  return { text, truncated };
}

function isRedirectResponse(response: Response): boolean {
  return response.status >= 300 && response.status <= 399;
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
