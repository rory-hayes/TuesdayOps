export type ProductionSmokeStatus = "pass" | "fail";

export type ProductionSmokeCheckId =
  | "health"
  | "sign-in-page"
  | "sign-up-page"
  | "google-sign-in-oauth"
  | "google-sign-up-oauth"
  | "auth-callback-error"
  | "sentry-example-page"
  | "sentry-example-api"
  | "scheduler-protection"
  | "app-route-protection"
  | "stripe-webhook-protection"
  | "security-headers";

export type ProductionSmokeCheck = {
  id: ProductionSmokeCheckId;
  label: string;
  status: ProductionSmokeStatus;
  detail: string;
};

export type ProductionSmokeResult = {
  ok: boolean;
  appUrl: string;
  checkedAt: string;
  checks: ProductionSmokeCheck[];
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type RunProductionSmokeInput = {
  appUrl: string;
  fetchImpl?: FetchLike;
};

export async function runProductionSmoke({
  appUrl,
  fetchImpl = fetch,
}: RunProductionSmokeInput): Promise<ProductionSmokeResult> {
  const normalizedAppUrl = normalizeAppUrl(appUrl);
  const checks: ProductionSmokeCheck[] = [];

  checks.push(await checkPublicHealth({ appUrl: normalizedAppUrl, fetchImpl }));
  checks.push(
    await checkAuthPage({
      id: "sign-in-page",
      label: "Sign-in page renders",
      appUrl: normalizedAppUrl,
      path: "/sign-in",
      expectedHeading: "Sign in to your account",
      fetchImpl,
    }),
  );
  checks.push(
    await checkAuthPage({
      id: "sign-up-page",
      label: "Sign-up page renders",
      appUrl: normalizedAppUrl,
      path: "/sign-up",
      expectedHeading: "Create your account",
      fetchImpl,
    }),
  );
  checks.push(
    await checkGoogleOAuthStart({
      id: "google-sign-in-oauth",
      label: "Google sign-in OAuth starts",
      appUrl: normalizedAppUrl,
      source: "sign-in",
      fetchImpl,
    }),
  );
  checks.push(
    await checkGoogleOAuthStart({
      id: "google-sign-up-oauth",
      label: "Google sign-up OAuth starts",
      appUrl: normalizedAppUrl,
      source: "sign-up",
      fetchImpl,
    }),
  );
  checks.push(await checkAuthCallbackError({ appUrl: normalizedAppUrl, fetchImpl }));
  checks.push(
    await checkExpectedStatus({
      id: "sentry-example-page",
      label: "Sentry example page gated",
      appUrl: normalizedAppUrl,
      path: "/sentry-example-page",
      method: "GET",
      expectedStatus: 404,
      fetchImpl,
    }),
  );
  checks.push(
    await checkExpectedStatus({
      id: "sentry-example-api",
      label: "Sentry example API gated",
      appUrl: normalizedAppUrl,
      path: "/api/sentry-example-api",
      method: "GET",
      expectedStatus: 404,
      fetchImpl,
    }),
  );
  checks.push(
    await checkExpectedStatus({
      id: "scheduler-protection",
      label: "Scheduler route requires secret",
      appUrl: normalizedAppUrl,
      path: "/api/scheduler/run-due-checks",
      method: "POST",
      expectedStatus: 401,
      fetchImpl,
    }),
  );
  checks.push(await checkAppRouteProtection({ appUrl: normalizedAppUrl, fetchImpl }));
  checks.push(
    await checkExpectedStatus({
      id: "stripe-webhook-protection",
      label: "Stripe webhook requires signature",
      appUrl: normalizedAppUrl,
      path: "/api/stripe/webhook",
      method: "POST",
      expectedStatus: 400,
      fetchImpl,
    }),
  );
  checks.push(await checkSecurityHeaders({ appUrl: normalizedAppUrl, fetchImpl }));

  return {
    ok: checks.every((check) => check.status === "pass"),
    appUrl: normalizedAppUrl,
    checkedAt: new Date().toISOString(),
    checks,
  };
}

async function checkSecurityHeaders({
  appUrl,
  fetchImpl,
}: {
  appUrl: string;
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}/`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    const issues = getSecurityHeaderIssues(response.headers);

    if (issues.length > 0) {
      return {
        id: "security-headers",
        label: "Browser security headers",
        status: "fail",
        detail: sentenceCase(issues.join("; ")) + ".",
      };
    }

    return {
      id: "security-headers",
      label: "Browser security headers",
      status: "pass",
      detail: "Required security headers are present and framework disclosure is disabled.",
    };
  } catch (error) {
    return {
      id: "security-headers",
      label: "Browser security headers",
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

async function checkAppRouteProtection({
  appUrl,
  fetchImpl,
}: {
  appUrl: string;
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}/clients`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "none";

    if (![302, 303, 307, 308].includes(response.status) || !isSignInLocation(location)) {
      return {
        id: "app-route-protection",
        label: "Authenticated app routes require sign-in",
        status: "fail",
        detail: `Expected redirect to /sign-in, received ${response.status} with location ${location}.`,
      };
    }

    return {
      id: "app-route-protection",
      label: "Authenticated app routes require sign-in",
      status: "pass",
      detail: `Received expected redirect to ${location}.`,
    };
  } catch (error) {
    return {
      id: "app-route-protection",
      label: "Authenticated app routes require sign-in",
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

async function checkAuthPage({
  id,
  label,
  appUrl,
  path,
  expectedHeading,
  fetchImpl,
}: {
  id: ProductionSmokeCheckId;
  label: string;
  appUrl: string;
  path: "/sign-in" | "/sign-up";
  expectedHeading: string;
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}${path}`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    const body = await response.text();
    const issues: string[] = [];

    if (response.status !== 200) {
      issues.push(`expected HTTP 200, received ${response.status}`);
    }

    if (!body.includes(expectedHeading)) {
      issues.push(`missing expected heading "${expectedHeading}"`);
    }

    if (!body.includes("Continue with Google")) {
      issues.push("missing Google OAuth entry point");
    }

    if (hasApplicationErrorShell(body)) {
      issues.push("rendered the Next.js application error shell");
    }

    if (issues.length > 0) {
      return {
        id,
        label,
        status: "fail",
        detail: `${sentenceCase(issues.join("; "))}.`,
      };
    }

    return {
      id,
      label,
      status: "pass",
      detail: `${path} returned the expected auth UI without an application error shell.`,
    };
  } catch (error) {
    return {
      id,
      label,
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

async function checkGoogleOAuthStart({
  id,
  label,
  appUrl,
  source,
  fetchImpl,
}: {
  id: ProductionSmokeCheckId;
  label: string;
  appUrl: string;
  source: "sign-in" | "sign-up";
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}/auth/google?source=${source}`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    const location = response.headers.get("location");
    const issues = getGoogleOAuthRedirectIssues({
      status: response.status,
      location,
      appUrl,
      source,
    });

    if (issues.length > 0) {
      return {
        id,
        label,
        status: "fail",
        detail: `${sentenceCase(issues.join("; "))}.`,
      };
    }

    return {
      id,
      label,
      status: "pass",
      detail: `Received expected provider redirect for ${source} with a production callback URL.`,
    };
  } catch (error) {
    return {
      id,
      label,
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

async function checkAuthCallbackError({
  appUrl,
  fetchImpl,
}: {
  appUrl: string;
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}/auth/callback?error=access_denied&source=sign-up`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "none";
    const issues: string[] = [];

    if (![302, 303, 307, 308].includes(response.status)) {
      issues.push(`expected redirect, received ${response.status}`);
    }

    const parsedLocation = parseUrl(location, appUrl);

    if (parsedLocation?.pathname !== "/sign-up") {
      issues.push(`expected redirect to /sign-up, received ${location}`);
    }

    if (!parsedLocation?.searchParams.get("error")) {
      issues.push("missing safe user-facing error message");
    }

    if (issues.length > 0) {
      return {
        id: "auth-callback-error",
        label: "Auth callback errors are safe",
        status: "fail",
        detail: `${sentenceCase(issues.join("; "))}.`,
      };
    }

    return {
      id: "auth-callback-error",
      label: "Auth callback errors are safe",
      status: "pass",
      detail: `Received expected redirect to ${parsedLocation?.pathname ?? "/sign-up"} with safe error copy.`,
    };
  } catch (error) {
    return {
      id: "auth-callback-error",
      label: "Auth callback errors are safe",
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

export function formatProductionSmokeReport(result: ProductionSmokeResult): string {
  const heading = `Production smoke ${result.ok ? "passed" : "failed"} for ${result.appUrl}`;
  const lines = result.checks.map(
    (check) => `[${check.status}] ${check.label}: ${redactSensitiveText(check.detail)}`,
  );

  return [heading, `Checked at ${result.checkedAt}`, ...lines].join("\n");
}

async function checkPublicHealth({
  appUrl,
  fetchImpl,
}: {
  appUrl: string;
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}/api/health`, {
      method: "GET",
      cache: "no-store",
    });
    const body = await response.text();
    const parsedBody = parseJsonObject(body);
    const issues: string[] = [];

    if (response.status !== 200) {
      issues.push(`expected HTTP 200, received ${response.status}`);
    }

    if (parsedBody?.ok !== true || parsedBody.launchReady !== true || parsedBody.status !== "ready") {
      issues.push("public health is not launch ready");
    }

    if (containsSecretShapedValue(body)) {
      issues.push("public health payload contains secret-shaped values");
    }

    if (issues.length > 0) {
      return {
        id: "health",
        label: "Public provider health",
        status: "fail",
        detail: `${sentenceCase(issues.join("; "))}.`,
      };
    }

    return {
      id: "health",
      label: "Public provider health",
      status: "pass",
      detail: "Launch-ready public health payload returned without secret-shaped values.",
    };
  } catch (error) {
    return {
      id: "health",
      label: "Public provider health",
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

async function checkExpectedStatus({
  id,
  label,
  appUrl,
  path,
  method,
  expectedStatus,
  fetchImpl,
}: {
  id: ProductionSmokeCheckId;
  label: string;
  appUrl: string;
  path: string;
  method: "GET" | "POST";
  expectedStatus: number;
  fetchImpl: FetchLike;
}): Promise<ProductionSmokeCheck> {
  try {
    const response = await fetchImpl(`${appUrl}${path}`, {
      method,
      cache: "no-store",
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? "{}" : undefined,
      redirect: "manual",
    });

    if (response.status !== expectedStatus) {
      return {
        id,
        label,
        status: "fail",
        detail: `Expected ${expectedStatus}, received ${response.status}.`,
      };
    }

    return {
      id,
      label,
      status: "pass",
      detail: `Received expected ${expectedStatus}.`,
    };
  } catch (error) {
    return {
      id,
      label,
      status: "fail",
      detail: `Request failed: ${formatUnknownError(error)}.`,
    };
  }
}

function normalizeAppUrl(appUrl: string): string {
  const parsedUrl = new URL(appUrl);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Production smoke URL must use http or https.");
  }

  return parsedUrl.origin;
}

function parseJsonObject(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isSignInLocation(location: string): boolean {
  if (location === "/sign-in") {
    return true;
  }

  try {
    return new URL(location).pathname === "/sign-in";
  } catch {
    return false;
  }
}

function getGoogleOAuthRedirectIssues({
  status,
  location,
  appUrl,
  source,
}: {
  status: number;
  location: string | null;
  appUrl: string;
  source: "sign-in" | "sign-up";
}): string[] {
  const issues: string[] = [];

  if (![302, 303, 307, 308].includes(status)) {
    issues.push(`expected redirect, received ${status}`);
  }

  if (!location) {
    issues.push("missing provider redirect location");
    return issues;
  }

  const providerUrl = parseUrl(location);

  if (!providerUrl) {
    issues.push(`provider redirect location is not a valid URL: ${location}`);
    return issues;
  }

  if (providerUrl.protocol !== "https:") {
    issues.push("provider redirect is not HTTPS");
  }

  if (providerUrl.pathname !== "/auth/v1/authorize") {
    issues.push(`expected Supabase authorize path, received ${providerUrl.pathname}`);
  }

  if (providerUrl.searchParams.get("provider") !== "google") {
    issues.push("provider redirect is not for Google");
  }

  if (!providerUrl.searchParams.get("code_challenge")) {
    issues.push("provider redirect is missing PKCE code challenge");
  }

  const callbackUrl = parseUrl(providerUrl.searchParams.get("redirect_to"));

  if (!callbackUrl) {
    issues.push("provider redirect is missing a valid callback URL");
    return issues;
  }

  if (callbackUrl.origin !== appUrl) {
    issues.push(`callback origin is ${callbackUrl.origin}, expected ${appUrl}`);
  }

  if (callbackUrl.pathname !== "/auth/callback") {
    issues.push(`callback path is ${callbackUrl.pathname}, expected /auth/callback`);
  }

  if (callbackUrl.searchParams.get("next") !== "/onboarding") {
    issues.push("callback next path is not /onboarding");
  }

  if (callbackUrl.searchParams.get("source") !== source) {
    issues.push(`callback source is not ${source}`);
  }

  return issues;
}

function parseUrl(value: string | null, base?: string): URL | null {
  if (!value) {
    return null;
  }

  try {
    return base ? new URL(value, base) : new URL(value);
  } catch {
    return null;
  }
}

function hasApplicationErrorShell(body: string): boolean {
  return body.includes('id="__next_error__"')
    || /Application error: a client-side exception has occurred/i.test(body);
}

function getSecurityHeaderIssues(headers: Headers): string[] {
  const issues: string[] = [];

  if (headers.get("x-content-type-options")?.toLowerCase() !== "nosniff") {
    issues.push("missing x-content-type-options=nosniff");
  }

  if (headers.get("referrer-policy")?.toLowerCase() !== "strict-origin-when-cross-origin") {
    issues.push("missing referrer-policy=strict-origin-when-cross-origin");
  }

  if (headers.get("x-frame-options")?.toUpperCase() !== "DENY") {
    issues.push("missing x-frame-options=DENY");
  }

  const csp = headers.get("content-security-policy")?.toLowerCase() ?? "";

  if (!csp.includes("frame-ancestors 'none'")) {
    issues.push("missing content-security-policy frame-ancestors 'none'");
  }

  const permissionsPolicy = headers.get("permissions-policy")?.toLowerCase() ?? "";

  for (const permission of ["camera=()", "microphone=()", "geolocation=()"]) {
    if (!permissionsPolicy.includes(permission)) {
      issues.push(`missing permissions-policy ${permission}`);
    }
  }

  const hsts = headers.get("strict-transport-security")?.toLowerCase() ?? "";

  if (!hsts.includes("max-age=") || !hsts.includes("includesubdomains")) {
    issues.push("missing strict-transport-security max-age with includeSubDomains");
  }

  if (headers.has("x-powered-by")) {
    issues.push("x-powered-by should not be exposed");
  }

  return issues;
}

function containsSecretShapedValue(value: string): boolean {
  return secretPatterns.some((pattern) => pattern.test(value));
}

function redactSensitiveText(value: string): string {
  return secretPatterns.reduce((redacted, pattern) => redacted.replace(pattern, "[redacted]"), value);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }

  return "Unknown production smoke error";
}

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const secretPatterns = [
  /\bsk_(?:live|test)_[A-Za-z0-9._-]+/g,
  /\bpk_(?:live|test)_[A-Za-z0-9._-]+/g,
  /\bre_[A-Za-z0-9._-]{8,}/g,
  /\bwhsec_[A-Za-z0-9._-]+/g,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"',\s)}]+/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/g,
];
