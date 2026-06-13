import { describe, expect, it } from "vitest";
import { evaluateAssertions } from "./assertions";

describe("evaluateAssertions", () => {
  const response = {
    statusCode: 200,
    latencyMs: 418,
    bodyText: '{"ok":true,"lead":{"email":"patient@example.com"},"message":"ready"}',
    bodyJson: {
      ok: true,
      lead: {
        email: "patient@example.com",
      },
      message: "ready",
    },
  };

  it("passes status, latency, field_exists, equals, and not_contains assertions", () => {
    const results = evaluateAssertions(
      [
        { type: "status_code", expected: 200 },
        { type: "latency_under", maxMs: 500 },
        { type: "field_exists", path: "lead.email" },
        { type: "equals", path: "ok", expected: true },
        { type: "not_contains", value: "trace_id" },
      ],
      response,
    );

    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("fails assertions with useful messages", () => {
    const results = evaluateAssertions(
      [
        { type: "status_code", expected: 201 },
        { type: "latency_under", maxMs: 100 },
        { type: "field_exists", path: "lead.phone" },
        { type: "equals", path: "message", expected: "done" },
        { type: "not_contains", value: "patient@example.com" },
      ],
      response,
    );

    expect(results).toEqual([
      expect.objectContaining({ passed: false, message: "Expected status 201, received 200." }),
      expect.objectContaining({ passed: false, message: "Expected latency under 100ms, received 418ms." }),
      expect.objectContaining({ passed: false, message: "Expected field lead.phone to exist." }),
      expect.objectContaining({ passed: false, message: 'Expected message to equal "done".' }),
      expect.objectContaining({ passed: false, message: 'Expected response not to contain "patient@example.com".' }),
    ]);
  });
});
