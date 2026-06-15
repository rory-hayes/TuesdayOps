import { z } from "zod";

export const statusCodeAssertionSchema = z.object({
  type: z.literal("status_code"),
  expected: z.coerce.number().int().min(100).max(599),
});

export const latencyUnderAssertionSchema = z.object({
  type: z.literal("latency_under"),
  maxMs: z.coerce.number().int().min(1).max(60000),
});

export const fieldExistsAssertionSchema = z.object({
  type: z.literal("field_exists"),
  path: z.string().trim().min(1),
});

export const equalsAssertionSchema = z.object({
  type: z.literal("equals"),
  path: z.string().trim().min(1),
  expected: z.unknown(),
});

export const notContainsAssertionSchema = z.object({
  type: z.literal("not_contains"),
  path: z.string().trim().min(1).optional(),
  value: z.string().trim().min(1),
});

export const assertionSchema = z.discriminatedUnion("type", [
  statusCodeAssertionSchema,
  latencyUnderAssertionSchema,
  fieldExistsAssertionSchema,
  equalsAssertionSchema,
  notContainsAssertionSchema,
]);

export const checkConfigSchema = z.object({
  timeoutMs: z.coerce.number().int().min(1000).max(60000).default(10000),
  requestBody: z.string().trim().optional(),
  assertions: z.array(assertionSchema).min(1).max(10),
});

export type CheckAssertion = z.infer<typeof assertionSchema>;
export type CheckConfig = z.infer<typeof checkConfigSchema>;

export type AssertionResponse = {
  statusCode?: number;
  latencyMs: number;
  bodyText: string;
  bodyJson?: unknown;
};

export type AssertionResult = {
  type: CheckAssertion["type"];
  passed: boolean;
  message: string;
};

export function evaluateAssertions(
  assertions: CheckAssertion[],
  response: AssertionResponse,
): AssertionResult[] {
  return assertions.map((assertion) => {
    switch (assertion.type) {
      case "status_code": {
        const passed = response.statusCode === assertion.expected;
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Received expected status ${assertion.expected}.`
            : `Expected status ${assertion.expected}, received ${response.statusCode ?? "none"}.`,
        };
      }
      case "latency_under": {
        const passed = response.latencyMs < assertion.maxMs;
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Latency ${response.latencyMs}ms is under ${assertion.maxMs}ms.`
            : `Expected latency under ${assertion.maxMs}ms, received ${response.latencyMs}ms.`,
        };
      }
      case "field_exists": {
        const value = getPath(response.bodyJson, assertion.path);
        const passed = value !== undefined;
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Field ${assertion.path} exists.`
            : `Expected field ${assertion.path} to exist.`,
        };
      }
      case "equals": {
        const value = getPath(response.bodyJson, assertion.path);
        const passed = deepEqual(value, assertion.expected);
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Field ${assertion.path} matched expected value.`
            : `Expected ${assertion.path} to equal ${JSON.stringify(assertion.expected)}.`,
        };
      }
      case "not_contains": {
        const source =
          assertion.path && response.bodyJson !== undefined
            ? stringifyValue(getPath(response.bodyJson, assertion.path))
            : response.bodyText;
        const passed = !source.includes(assertion.value);
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Response did not contain ${JSON.stringify(assertion.value)}.`
            : `Expected response not to contain ${JSON.stringify(assertion.value)}.`,
        };
      }
      default: {
        assertion satisfies never;
        return {
          type: "status_code",
          passed: false,
          message: "Unsupported assertion.",
        };
      }
    }
  });
}

function getPath(source: unknown, path: string): unknown {
  if (source === null || source === undefined) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value) ?? "";
}
