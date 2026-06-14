import type { CheckRunStatus } from "@/lib/domain/types";
import {
  assertSafeWorkflowEndpoint,
  shouldAllowPrivateWorkflowEndpoints,
} from "@/lib/security/endpoint-url";
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const headers = buildHeaders(authConfig);
  const requestInit: RequestInit = {
    method: workflow.method,
    headers,
    signal: controller.signal,
    redirect: "manual",
  };

  if (workflow.method !== "GET" && config.requestBody) {
    requestInit.body = config.requestBody;
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  try {
    const endpointUrl = assertSafeWorkflowEndpoint(workflow.endpointUrl, {
      allowPrivateEndpoints: shouldAllowPrivateWorkflowEndpoints(),
    });
    const response = await fetch(endpointUrl, requestInit);
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
    const status: CheckRunStatus = assertionResults.every((result) => result.passed)
      ? "healthy"
      : "failed";

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
  } finally {
    clearTimeout(timeout);
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

function summarizeResponse(value: string, options: { truncated?: boolean } = {}): string {
  const summary = value
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
