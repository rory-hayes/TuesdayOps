import { describe, expect, it } from "vitest";
import {
  assertSafeWorkflowEndpoint,
  validateWorkflowEndpointUrl,
} from "./endpoint-url";

describe("validateWorkflowEndpointUrl", () => {
  it("allows public HTTP and HTTPS workflow endpoints", () => {
    expect(validateWorkflowEndpointUrl("https://api.example.com/health").allowed).toBe(true);
    expect(validateWorkflowEndpointUrl("http://api.example.com/health").allowed).toBe(true);
  });

  it("blocks localhost and loopback endpoints by default", () => {
    expect(validateWorkflowEndpointUrl("http://localhost:3000/api/check").allowed).toBe(false);
    expect(validateWorkflowEndpointUrl("http://127.0.0.1:3000/api/check").allowed).toBe(false);
    expect(validateWorkflowEndpointUrl("http://[::1]:3000/api/check").allowed).toBe(false);
  });

  it("blocks private, link-local, and cloud metadata IPv4 endpoints by default", () => {
    const blocked = [
      "http://10.0.0.5/check",
      "http://172.16.0.5/check",
      "http://192.168.1.10/check",
      "http://169.254.10.10/check",
      "http://169.254.169.254/latest/meta-data",
    ];

    for (const endpoint of blocked) {
      expect(validateWorkflowEndpointUrl(endpoint).allowed, endpoint).toBe(false);
    }
  });

  it("allows private endpoints when explicitly enabled for local development", () => {
    expect(validateWorkflowEndpointUrl("http://localhost:3000/api/check", {
      allowPrivateEndpoints: true,
    }).allowed).toBe(true);
  });
});

describe("assertSafeWorkflowEndpoint", () => {
  it("throws a report-safe error for unsafe endpoints", () => {
    expect(() => assertSafeWorkflowEndpoint("http://169.254.169.254/latest/meta-data")).toThrow(
      "Private or local workflow endpoints are blocked in production.",
    );
  });
});
