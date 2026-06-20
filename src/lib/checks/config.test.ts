import { describe, expect, it } from "vitest";
import { buildHealthCheckConfig } from "@/lib/checks/config";

describe("buildHealthCheckConfig", () => {
  it("builds status, latency, body, and simple assertion config from form input", () => {
    expect(buildHealthCheckConfig({
      expectedStatus: 201,
      maxLatencyMs: 2500,
      timeoutMs: 8000,
      requestBody: '{"ping":true}',
      responseContains: "approved",
      jsonFieldPath: "result.id",
      fieldNotEmptyPath: "result.answer",
      notContainsValue: "internal_error",
      matchesRegexPattern: "case-[0-9]+",
      requireValidJson: true,
    })).toEqual({
      timeoutMs: 8000,
      requestBody: '{"ping":true}',
      assertions: [
        { type: "status_code", expected: 201 },
        { type: "latency_under", maxMs: 2500 },
        { type: "valid_json" },
        { type: "contains_text", value: "approved" },
        { type: "field_exists", path: "result.id" },
        { type: "field_not_empty", path: "result.answer" },
        { type: "not_contains", value: "internal_error" },
        { type: "matches_regex", pattern: "case-[0-9]+" },
      ],
    });
  });

  it("trims optional text and keeps the default health-check assertions compact", () => {
    expect(buildHealthCheckConfig({
      expectedStatus: 200,
      maxLatencyMs: 5000,
      timeoutMs: 10000,
      requestBody: "   ",
      responseContains: "   ",
    })).toEqual({
      timeoutMs: 10000,
      requestBody: undefined,
      assertions: [
        { type: "status_code", expected: 200 },
        { type: "latency_under", maxMs: 5000 },
      ],
    });
  });

  it("rejects regex assertions with nested quantifiers before they can block check execution", () => {
    expect(() => buildHealthCheckConfig({
      expectedStatus: 200,
      maxLatencyMs: 5000,
      timeoutMs: 10000,
      matchesRegexPattern: "^(a+)+$",
    })).toThrow("Regex pattern is too complex for workflow checks.");
  });
});
