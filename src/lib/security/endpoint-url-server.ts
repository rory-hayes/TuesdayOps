import { lookup } from "node:dns/promises";
import {
  assertSafeWorkflowEndpoint,
  isPrivateOrLocalHostname,
  type EndpointValidationOptions,
} from "@/lib/security/endpoint-url";

export async function assertResolvedWorkflowEndpointIsSafe(
  value: string,
  options: EndpointValidationOptions = {},
): Promise<string> {
  const endpointUrl = assertSafeWorkflowEndpoint(value, options);

  if (options.allowPrivateEndpoints) {
    return endpointUrl;
  }

  const url = new URL(endpointUrl);
  const addresses = await resolveEndpointHost(url.hostname);

  if (addresses.some((address) => isPrivateOrLocalHostname(address))) {
    throw new Error("Private or local workflow endpoints are blocked in production.");
  }

  return endpointUrl;
}

async function resolveEndpointHost(hostname: string): Promise<string[]> {
  if (isPrivateOrLocalHostname(hostname)) {
    return [hostname];
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => record.address);
  } catch {
    throw new Error("Workflow endpoint host could not be resolved.");
  }
}
