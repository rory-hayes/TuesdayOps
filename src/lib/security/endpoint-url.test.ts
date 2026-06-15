import { describe, expect, it } from "vitest";
import {
  assertSafeWorkflowEndpoint,
  shouldAllowPrivateWorkflowEndpoints,
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

  it("rejects malformed and non-http URLs", () => {
    expect(validateWorkflowEndpointUrl("not a url")).toEqual({
      allowed: false,
      reason: "Workflow endpoint must be a valid URL.",
    });
    expect(validateWorkflowEndpointUrl("ftp://api.example.com/check")).toEqual({
      allowed: false,
      reason: "Workflow endpoint must use HTTP or HTTPS.",
    });
  });

  it("blocks local development hostnames and IPv6 private ranges", () => {
    const blocked = [
      "http://app.localhost/check",
      "http://service.local/check",
      "http://[fd00::1]/check",
      "http://[fe80::1]/check",
    ];

    for (const endpoint of blocked) {
      expect(validateWorkflowEndpointUrl(endpoint).allowed, endpoint).toBe(false);
    }
  });

  it("ignores non-IP hostnames when checking private IPv4 ranges", () => {
    expect(validateWorkflowEndpointUrl("https://api.not-an-ip.example/check")).toEqual({
      allowed: true,
      url: "https://api.not-an-ip.example/check",
    });
  });
});

describe("assertSafeWorkflowEndpoint", () => {
  it("throws a report-safe error for unsafe endpoints", () => {
    expect(() => assertSafeWorkflowEndpoint("http://169.254.169.254/latest/meta-data")).toThrow(
      "Private or local workflow endpoints are blocked in production.",
    );
  });

  it("returns normalized safe URLs and reads private endpoint policy from env", () => {
    expect(assertSafeWorkflowEndpoint("https://api.example.com/check?ok=true")).toBe(
      "https://api.example.com/check?ok=true",
    );
    expect(shouldAllowPrivateWorkflowEndpoints({
      NODE_ENV: "production",
      ALLOW_PRIVATE_WORKFLOW_ENDPOINTS: "false",
    })).toBe(false);
    expect(shouldAllowPrivateWorkflowEndpoints({
      NODE_ENV: "production",
      ALLOW_PRIVATE_WORKFLOW_ENDPOINTS: "true",
    })).toBe(true);
    expect(shouldAllowPrivateWorkflowEndpoints({ NODE_ENV: "development" })).toBe(true);
  });
});
