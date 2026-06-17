export type EndpointValidationOptions = {
  allowPrivateEndpoints?: boolean;
};

export type EndpointValidationResult =
  | { allowed: true; url: string }
  | { allowed: false; reason: string };

export const unsafeEndpointMessage = "Private or local workflow endpoints are blocked in production.";

export function validateWorkflowEndpointUrl(
  value: string,
  options: EndpointValidationOptions = {},
): EndpointValidationResult {
  const endpointUrl = value.trim();
  let url: URL;

  try {
    url = new URL(endpointUrl);
  } catch {
    return { allowed: false, reason: "Workflow endpoint must be a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { allowed: false, reason: "Workflow endpoint must use HTTP or HTTPS." };
  }

  if (options.allowPrivateEndpoints) {
    return { allowed: true, url: endpointUrl };
  }

  if (isPrivateOrLocalHostname(url.hostname)) {
    return { allowed: false, reason: unsafeEndpointMessage };
  }

  return { allowed: true, url: endpointUrl };
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

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  return isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}

function isPrivateIpv4(value: string): boolean {
  const octets = value.split(".").map((part) => Number(part));

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

function isPrivateIpv6(value: string): boolean {
  if (!value.includes(":")) {
    return false;
  }

  if (value === "::" || value === "::1" || value === "0:0:0:0:0:0:0:1") {
    return true;
  }

  const mappedIpv4 = value.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (mappedIpv4 && isPrivateIpv4(mappedIpv4)) {
    return true;
  }

  const firstSegment = value.split(":")[0];
  const firstHextet = Number.parseInt(firstSegment || "0", 16);

  if (!Number.isFinite(firstHextet)) {
    return false;
  }

  return (firstHextet & 0xfe00) === 0xfc00 || (firstHextet & 0xffc0) === 0xfe80;
}
