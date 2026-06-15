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

  it("handles array paths, path-scoped not_contains, and missing status codes", () => {
    const results = evaluateAssertions(
      [
        { type: "field_exists", path: "items.1.id" },
        { type: "equals", path: "items.0.status", expected: "ready" },
        { type: "not_contains", path: "items.1.message", value: "fatal" },
        { type: "status_code", expected: 200 },
      ],
      {
        latencyMs: 99,
        bodyText: "fallback body",
        bodyJson: {
          items: [
            { id: "first", status: "ready" },
            { id: "second", message: "all good" },
          ],
        },
      },
    );

    expect(results).toEqual([
      expect.objectContaining({ passed: true, message: "Field items.1.id exists." }),
      expect.objectContaining({ passed: true, message: "Field items.0.status matched expected value." }),
      expect.objectContaining({ passed: true, message: 'Response did not contain "fatal".' }),
      expect.objectContaining({ passed: false, message: "Expected status 200, received none." }),
    ]);
  });

  it("treats null bodies and invalid array paths as missing fields", () => {
    const results = evaluateAssertions(
      [
        { type: "field_exists", path: "lead.email" },
        { type: "field_exists", path: "items.nope" },
      ],
      {
        statusCode: 200,
        latencyMs: 10,
        bodyText: "",
        bodyJson: {
          items: [{ id: "first" }],
        },
      },
    );

    expect(results.every((result) => !result.passed)).toBe(true);
  });

  it("does not throw when path-scoped not_contains reads a missing value", () => {
    expect(
      evaluateAssertions(
        [{ type: "not_contains", path: "lead.secret", value: "token" }],
        {
          statusCode: 200,
          latencyMs: 10,
          bodyText: "{\"ok\":true}",
          bodyJson: { ok: true },
        },
      ),
    ).toEqual([
      expect.objectContaining({
        passed: true,
        message: 'Response did not contain "token".',
      }),
    ]);
  });

  it("returns a safe unsupported assertion result for unknown assertion records", () => {
    expect(
      evaluateAssertions(
        [{ type: "unknown" } as never],
        {
          statusCode: 200,
          latencyMs: 10,
          bodyText: "",
        },
      ),
    ).toEqual([
      {
        type: "status_code",
        passed: false,
        message: "Unsupported assertion.",
      },
    ]);
  });
});
