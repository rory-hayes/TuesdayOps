import { describe, expect, it, vi } from "vitest";
import { buildAuditEventInsert, recordAuditEvent, recordAuditEventSafely } from "./events";

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

  it("defaults optional actor, target, and metadata fields for system events", () => {
    expect(
      buildAuditEventInsert({
        agencyId: "agency-1",
        action: "check.run",
        targetType: "check",
      }),
    ).toEqual({
      agency_id: "agency-1",
      actor_user_id: null,
      action: "check.run",
      target_type: "check",
      target_id: null,
      metadata_json: {},
    });
  });

  it("redacts sensitive metadata nested inside arrays", () => {
    expect(
      buildAuditEventInsert({
        agencyId: "agency-1",
        action: "workflow.updated",
        targetType: "workflow",
        metadata: {
          checks: [
            { name: "safe", bearerToken: "token_123" },
            { name: "still safe", result: "healthy" },
          ],
        },
      }).metadata_json,
    ).toEqual({
      checks: [
        { name: "safe", bearerToken: "[redacted]" },
        { name: "still safe", result: "healthy" },
      ],
    });
  });

  it("records audit events and surfaces persistence failures", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as never;

    await recordAuditEvent({
      supabase,
      agencyId: "agency-1",
      action: "report.generated",
      targetType: "report",
      targetId: "report-1",
    });

    expect(from).toHaveBeenCalledWith("audit_events");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: "agency-1",
        action: "report.generated",
        target_id: "report-1",
      }),
    );

    const failingSupabase = {
      from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: { message: "RLS denied" } }) })),
    } as never;

    await expect(
      recordAuditEvent({
        supabase: failingSupabase,
        agencyId: "agency-1",
        action: "report.generated",
        targetType: "report",
      }),
    ).rejects.toThrow("Audit event could not be recorded: RLS denied");
  });

  it("never blocks the primary action when safe audit recording fails", async () => {
    const supabase = {
      from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: { message: "offline" } }) })),
    } as never;

    await expect(
      recordAuditEventSafely({
        supabase,
        agencyId: "agency-1",
        action: "billing.webhook_processed",
        targetType: "billing_event",
      }),
    ).resolves.toBeUndefined();
  });
});
