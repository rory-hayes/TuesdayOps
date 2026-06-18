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
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && octets[2] === 0) ||
    (first === 192 && second === 0 && octets[2] === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && octets[2] === 100) ||
    (first === 203 && second === 0 && octets[2] === 113) ||
    (first === 169 && second === 254) ||
    first === 0 ||
    first >= 224
  );
}

function isPrivateIpv6(value: string): boolean {
  if (!value.includes(":")) {
    return false;
  }

  const normalized = value.toLowerCase();
  const mappedIpv4 = parseIpv4MappedIpv6(normalized);

  if (mappedIpv4) {
    return isPrivateIpv4(mappedIpv4);
  }

  if (normalized === "::" || normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    return true;
  }

  const firstSegment = normalized.split(":")[0];
  const firstHextet = Number.parseInt(firstSegment || "0", 16);

  if (!Number.isFinite(firstHextet)) {
    return false;
  }

  return (
    (firstHextet & 0xfe00) === 0xfc00 ||
    (firstHextet & 0xffc0) === 0xfe80 ||
    (firstHextet & 0xff00) === 0xff00 ||
    firstHextet === 0x2001 && normalized.startsWith("2001:db8:")
  );
}

function parseIpv4MappedIpv6(value: string): string | null {
  const dotted = value.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (dotted) {
    return dotted;
  }

  const hex = value.match(/(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);

  if (!hex) {
    return null;
  }

  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);

  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return null;
  }

  return [
    (high >> 8) & 255,
    high & 255,
    (low >> 8) & 255,
    low & 255,
  ].join(".");
}
