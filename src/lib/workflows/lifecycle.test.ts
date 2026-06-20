import { describe, expect, it } from "vitest";
import {
  buildWorkflowArchiveUpdate,
  buildWorkflowAuthUpdate,
  buildWorkflowSettingsUpdate,
  buildPrimaryHealthCheckMutation,
} from "./lifecycle";

describe("workflow lifecycle helpers", () => {
  it("archives workflows without deleting historical data", () => {
    const update = buildWorkflowArchiveUpdate("2026-06-16T10:15:00.000Z");

    expect(update).toEqual({
      archived_at: "2026-06-16T10:15:00.000Z",
      included_in_reports: false,
    });
    expect(update).not.toHaveProperty("delete");
    expect(update).not.toHaveProperty("check_runs");
    expect(update).not.toHaveProperty("issues");
    expect(update).not.toHaveProperty("reports");
  });

  it("builds workflow update payloads that preserve endpoint path and query details", () => {
    expect(buildWorkflowSettingsUpdate({
      input: {
        name: "Lead intake monitor",
        type: "custom_api",
        environment: "staging",
        method: "POST",
        checkFrequencyMinutes: 15,
        includedInReports: true,
      },
      endpointUrl: "https://api.example.com/v1/Lead%20Intake?signature=a%2Fb&next=%2Fcallback",
      authUpdate: {
        auth_type: "bearer",
      },
    })).toEqual({
      name: "Lead intake monitor",
      type: "custom_api",
      environment: "staging",
      endpoint_url: "https://api.example.com/v1/Lead%20Intake?signature=a%2Fb&next=%2Fcallback",
      method: "POST",
      auth_type: "bearer",
      check_frequency_minutes: 15,
      included_in_reports: true,
    });
  });

  it("preserves an existing encrypted auth secret when the rotation field is blank", () => {
    const update = buildWorkflowAuthUpdate({
      input: {
        authType: "bearer",
      },
      current: {
        auth_type: "bearer",
        endpoint_url: "https://api.example.com/health",
        encrypted_auth_config: {
          v: 1,
          alg: "aes-256-gcm",
          iv: "iv",
          tag: "tag",
          ciphertext: "existing-secret-ciphertext",
        },
      },
      nextEndpointUrl: "https://api.example.com/v2/health",
      encryptPayload: () => {
        throw new Error("Blank auth secret should not re-encrypt.");
      },
    });

    expect(update).toEqual({
      auth_type: "bearer",
    });
    expect(update).not.toHaveProperty("encrypted_auth_config");
  });

  it("requires a new auth secret before preserving credentials across endpoint host changes", () => {
    expect(() => buildWorkflowAuthUpdate({
      input: {
        authType: "bearer",
      },
      current: {
        auth_type: "bearer",
        endpoint_url: "https://api.example.com/health",
        encrypted_auth_config: {
          v: 1,
          alg: "aes-256-gcm",
          iv: "iv",
          tag: "tag",
          ciphertext: "existing-secret-ciphertext",
        },
      },
      nextEndpointUrl: "https://capture.example.net/health",
      encryptPayload: () => {
        throw new Error("Endpoint host changes without a new secret should not re-encrypt.");
      },
    })).toThrow("Enter a new auth secret before moving saved credentials to a different endpoint host.");
  });

  it("encrypts newly rotated auth material without returning plaintext secret values", () => {
    const update = buildWorkflowAuthUpdate({
      input: {
        authType: "api_key_header",
        authSecret: "new-secret-api-key",
        authHeaderName: "x-client-key",
      },
      current: {
        auth_type: "api_key_header",
        encrypted_auth_config: null,
      },
      encryptPayload: (payload) => {
        expect(payload).toEqual({
          type: "api_key_header",
          headerName: "x-client-key",
          value: "new-secret-api-key",
        });

        return {
          v: 1,
          alg: "aes-256-gcm",
          iv: "safe-iv",
          tag: "safe-tag",
          ciphertext: "safe-ciphertext",
        };
      },
    });

    expect(update).toEqual({
      auth_type: "api_key_header",
      encrypted_auth_config: {
        v: 1,
        alg: "aes-256-gcm",
        iv: "safe-iv",
        tag: "safe-tag",
        ciphertext: "safe-ciphertext",
      },
    });
    expect(JSON.stringify(update)).not.toContain("new-secret-api-key");
  });

  it("clears encrypted auth material when auth is changed to none", () => {
    expect(buildWorkflowAuthUpdate({
      input: {
        authType: "none",
      },
      current: {
        auth_type: "bearer",
        encrypted_auth_config: {
          v: 1,
          alg: "aes-256-gcm",
          iv: "iv",
          tag: "tag",
          ciphertext: "existing-secret-ciphertext",
        },
      },
      encryptPayload: () => {
        throw new Error("Auth none should not encrypt.");
      },
    })).toEqual({
      auth_type: "none",
      encrypted_auth_config: null,
    });
  });

  it("requires a new secret before changing auth type away from saved credentials", () => {
    expect(() => buildWorkflowAuthUpdate({
      input: {
        authType: "basic",
        basicUsername: "ops",
      },
      current: {
        auth_type: "bearer",
        encrypted_auth_config: {
          v: 1,
          alg: "aes-256-gcm",
          iv: "iv",
          tag: "tag",
          ciphertext: "existing-secret-ciphertext",
        },
      },
      encryptPayload: () => {
        throw new Error("Should not encrypt invalid updates.");
      },
    })).toThrow("Enter a new auth secret before enabling or changing workflow authentication.");
  });

  it("updates the primary health check when one already exists", () => {
    expect(buildPrimaryHealthCheckMutation({
      existingCheckId: "check-1",
      agencyId: "agency-1",
      workflowId: "workflow-1",
      frequencyMinutes: 30,
      configJson: {
        timeoutMs: 12000,
        assertions: [
          { type: "status_code", expected: 202 },
          { type: "latency_under", maxMs: 3000 },
        ],
      },
    })).toEqual({
      mode: "update",
      checkId: "check-1",
      values: {
        config_json: {
          timeoutMs: 12000,
          assertions: [
            { type: "status_code", expected: 202 },
            { type: "latency_under", maxMs: 3000 },
          ],
        },
        schedule: "Every 30 minutes",
        enabled: true,
      },
    });
  });

  it("creates the primary health check when none exists", () => {
    expect(buildPrimaryHealthCheckMutation({
      agencyId: "agency-1",
      workflowId: "workflow-1",
      frequencyMinutes: 45,
      configJson: {
        timeoutMs: 9000,
        assertions: [{ type: "contains_text", value: "ok" }],
      },
    })).toEqual({
      mode: "insert",
      values: {
        agency_id: "agency-1",
        workflow_id: "workflow-1",
        name: "Endpoint health check",
        type: "health",
        config_json: {
          timeoutMs: 9000,
          assertions: [{ type: "contains_text", value: "ok" }],
        },
        schedule: "Every 45 minutes",
        enabled: true,
      },
    });
  });
});
