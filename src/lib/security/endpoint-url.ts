export type EndpointValidationOptions = {
  allowPrivateEndpoints?: boolean;
};

export type EndpointValidationResult =
  | { allowed: true; url: string }
  | { allowed: false; reason: string };

const unsafeEndpointMessage = "Private or local workflow endpoints are blocked in production.";

export function validateWorkflowEndpointUrl(
  value: string,
  options: EndpointValidationOptions = {},
): EndpointValidationResult {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { allowed: false, reason: "Workflow endpoint must be a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { allowed: false, reason: "Workflow endpoint must use HTTP or HTTPS." };
  }

  if (options.allowPrivateEndpoints) {
    return { allowed: true, url: url.toString() };
  }

  if (isPrivateOrLocalHostname(url.hostname)) {
    return { allowed: false, reason: unsafeEndpointMessage };
  }

  return { allowed: true, url: url.toString() };
}

export function assertSafeWorkflowEndpoint(
  value: string,
  options: EndpointValidationOptions = {},
): string {
  const result = validateWorkflowEndpointUrl(value, options);

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  return result.url;
}

export function shouldAllowPrivateWorkflowEndpoints(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_PRIVATE_WORKFLOW_ENDPOINTS === "true" || env.NODE_ENV !== "production";
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  ) {
    return true;
  }

  const octets = normalized.split(".").map((part) => Number(part));

  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}
