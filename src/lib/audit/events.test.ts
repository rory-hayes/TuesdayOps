import { describe, expect, it } from "vitest";
import { buildAuditEventInsert } from "./events";

describe("buildAuditEventInsert", () => {
  it("stores tenant and target context without exposing raw secrets", () => {
    expect(
      buildAuditEventInsert({
        agencyId: "agency-1",
        actorUserId: "user-1",
        action: "workflow.created",
        targetType: "workflow",
        targetId: "workflow-1",
        metadata: {
          workflowName: "Lead intake",
          endpointUrl: "https://api.example.com/lead",
          authSecret: "secret_123",
          Authorization: "Bearer token_123",
          nested: {
            apiKey: "api_key_123",
            safe: "kept",
          },
        },
      }),
    ).toEqual({
      agency_id: "agency-1",
      actor_user_id: "user-1",
      action: "workflow.created",
      target_type: "workflow",
      target_id: "workflow-1",
      metadata_json: {
        workflowName: "Lead intake",
        endpointUrl: "https://api.example.com/lead",
        authSecret: "[redacted]",
        Authorization: "[redacted]",
        nested: {
          apiKey: "[redacted]",
          safe: "kept",
        },
      },
    });
  });
});
