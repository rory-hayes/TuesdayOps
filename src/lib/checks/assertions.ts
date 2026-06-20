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

export const fieldNotEmptyAssertionSchema = z.object({
  type: z.literal("field_not_empty"),
  path: z.string().trim().min(1),
});

export const equalsAssertionSchema = z.object({
  type: z.literal("equals"),
  path: z.string().trim().min(1),
  expected: z.unknown(),
});

export const containsTextAssertionSchema = z.object({
  type: z.literal("contains_text"),
  path: z.string().trim().min(1).optional(),
  value: z.string().trim().min(1),
});

export const notContainsAssertionSchema = z.object({
  type: z.literal("not_contains"),
  path: z.string().trim().min(1).optional(),
  value: z.string().trim().min(1),
});

export const unsafeRegexPatternMessage = "Regex pattern is too complex for workflow checks.";

export const matchesRegexAssertionSchema = z.object({
  type: z.literal("matches_regex"),
  path: z.string().trim().min(1).optional(),
  pattern: z.string().trim().min(1).max(500).refine(isSafeRegexPattern, {
    message: unsafeRegexPatternMessage,
  }),
});

export const validJsonAssertionSchema = z.object({
  type: z.literal("valid_json"),
});

export const assertionSchema = z.discriminatedUnion("type", [
  statusCodeAssertionSchema,
  latencyUnderAssertionSchema,
  fieldExistsAssertionSchema,
  fieldNotEmptyAssertionSchema,
  equalsAssertionSchema,
  containsTextAssertionSchema,
  notContainsAssertionSchema,
  matchesRegexAssertionSchema,
  validJsonAssertionSchema,
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
      case "field_not_empty": {
        const value = getPath(response.bodyJson, assertion.path);
        const passed = !isEmptyValue(value);
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Field ${assertion.path} was not empty.`
            : `Expected field ${assertion.path} to be present and not empty.`,
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
      case "contains_text": {
        const source = getAssertionSource(response, assertion.path);
        const passed = source.includes(assertion.value);
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Response contained ${JSON.stringify(assertion.value)}.`
            : `Expected response to contain ${JSON.stringify(assertion.value)}.`,
        };
      }
      case "not_contains": {
        const source = getAssertionSource(response, assertion.path);
        const passed = !source.includes(assertion.value);
        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Response did not contain ${JSON.stringify(assertion.value)}.`
            : `Expected response not to contain ${JSON.stringify(assertion.value)}.`,
        };
      }
      case "matches_regex": {
        if (!isSafeRegexPattern(assertion.pattern)) {
          return {
            type: assertion.type,
            passed: false,
            message: `Regex pattern ${JSON.stringify(assertion.pattern)} is too complex for workflow checks.`,
          };
        }

        const regex = buildRegex(assertion.pattern);

        if (!regex) {
          return {
            type: assertion.type,
            passed: false,
            message: `Regex pattern ${JSON.stringify(assertion.pattern)} was invalid.`,
          };
        }

        const source = getAssertionSource(response, assertion.path);
        const passed = regex.test(source);

        return {
          type: assertion.type,
          passed,
          message: passed
            ? `Response matched regex ${JSON.stringify(assertion.pattern)}.`
            : `Expected response to match regex ${JSON.stringify(assertion.pattern)}.`,
        };
      }
      case "valid_json": {
        const passed = response.bodyJson !== undefined;

        return {
          type: assertion.type,
          passed,
          message: passed
            ? "Response body parsed as valid JSON."
            : "Expected response body to be valid JSON.",
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

function getAssertionSource(response: AssertionResponse, path?: string): string {
  if (path && response.bodyJson !== undefined) {
    return stringifyValue(getPath(response.bodyJson, path));
  }

  return response.bodyText;
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

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

function buildRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

export function isSafeRegexPattern(pattern: string): boolean {
  return !hasBackreference(pattern) && !hasNestedQuantifiedGroup(pattern);
}

function hasBackreference(pattern: string): boolean {
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === "\\") {
      const next = pattern[index + 1];
      if (next && /[1-9]/.test(next)) {
        return true;
      }
      index += 1;
      continue;
    }

    if (char === "[") {
      inCharacterClass = true;
      continue;
    }

    if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
    }
  }

  return false;
}

function hasNestedQuantifiedGroup(pattern: string): boolean {
  const groupStarts: number[] = [];
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === "\\") {
      index += 1;
      continue;
    }

    if (char === "[") {
      inCharacterClass = true;
      continue;
    }

    if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }

    if (inCharacterClass) {
      continue;
    }

    if (char === "(") {
      groupStarts.push(index + 1);
      continue;
    }

    if (char !== ")" || !groupStarts.length) {
      continue;
    }

    const groupStart = groupStarts.pop();
    if (!isRegexQuantifierStart(pattern[index + 1])) {
      continue;
    }

    const groupContent = pattern.slice(groupStart, index);
    if (containsRegexQuantifier(groupContent) || containsTopLevelAlternation(groupContent)) {
      return true;
    }
  }

  return false;
}

function containsRegexQuantifier(pattern: string): boolean {
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === "\\") {
      index += 1;
      continue;
    }

    if (char === "[") {
      inCharacterClass = true;
      continue;
    }

    if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }

    if (inCharacterClass || (index === 0 && char === "?")) {
      continue;
    }

    if (isRegexQuantifierStart(char)) {
      return true;
    }
  }

  return false;
}

function containsTopLevelAlternation(pattern: string): boolean {
  let depth = 0;
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === "\\") {
      index += 1;
      continue;
    }

    if (char === "[") {
      inCharacterClass = true;
      continue;
    }

    if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }

    if (inCharacterClass) {
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")" && depth > 0) {
      depth -= 1;
      continue;
    }

    if (char === "|" && depth === 0) {
      return true;
    }
  }

  return false;
}

function isRegexQuantifierStart(value?: string): boolean {
  return value === "*" || value === "+" || value === "?" || value === "{";
}
