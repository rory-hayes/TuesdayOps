import { checkConfigSchema, type CheckAssertion, type CheckConfig } from "@/lib/checks/assertions";

export type HealthCheckConfigInput = {
  expectedStatus: number;
  maxLatencyMs: number;
  timeoutMs: number;
  requestBody?: string;
  responseContains?: string;
  jsonFieldPath?: string;
  fieldNotEmptyPath?: string;
  notContainsValue?: string;
  matchesRegexPattern?: string;
  requireValidJson?: boolean;
};

export function buildHealthCheckConfig(input: HealthCheckConfigInput): CheckConfig {
  return checkConfigSchema.parse({
    timeoutMs: input.timeoutMs,
    requestBody: normalizeOptionalText(input.requestBody),
    assertions: buildHealthCheckAssertions(input),
  });
}

export function buildHealthCheckAssertions(input: HealthCheckConfigInput): CheckAssertion[] {
  const assertions: CheckAssertion[] = [
    { type: "status_code", expected: input.expectedStatus },
    { type: "latency_under", maxMs: input.maxLatencyMs },
  ];

  if (input.requireValidJson) {
    assertions.push({ type: "valid_json" });
  }

  const responseContains = normalizeOptionalText(input.responseContains);
  if (responseContains) {
    assertions.push({ type: "contains_text", value: responseContains });
  }

  const jsonFieldPath = normalizeOptionalText(input.jsonFieldPath);
  if (jsonFieldPath) {
    assertions.push({ type: "field_exists", path: jsonFieldPath });
  }

  const fieldNotEmptyPath = normalizeOptionalText(input.fieldNotEmptyPath);
  if (fieldNotEmptyPath) {
    assertions.push({ type: "field_not_empty", path: fieldNotEmptyPath });
  }

  const notContainsValue = normalizeOptionalText(input.notContainsValue);
  if (notContainsValue) {
    assertions.push({ type: "not_contains", value: notContainsValue });
  }

  const matchesRegexPattern = normalizeOptionalText(input.matchesRegexPattern);
  if (matchesRegexPattern) {
    assertions.push({ type: "matches_regex", pattern: matchesRegexPattern });
  }

  return assertions;
}

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
