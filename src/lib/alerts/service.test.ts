import { describe, expect, it, vi } from "vitest";
import { sendIssueAlertForNewIssue } from "@/lib/alerts/service";
import type { IssueDraft } from "@/lib/issues/engine";
import type { IssueRunContext } from "@/lib/issues/operations";

const draft: IssueDraft = {
  fingerprint: "check-1:status_code:500",
  severity: "high",
  title: "Risk router returned HTTP 500",
  description: "Endpoint health received HTTP 500 instead of the expected status code.",
  suggestedAction: "Review the workflow endpoint and recent deployment changes.",
  reportable: true,
};

const context: IssueRunContext = {
  agencyId: "agency-1",
  clientId: "client-1",
  workflowId: "workflow-1",
  workflowName: "Risk Router",
  checkId: "check-1",
  checkName: "Endpoint health",
  checkRunId: "run-1",
  status: "failed",
  statusCode: 500,
  latencyMs: 100,
  assertionResults: [],
};

describe("sendIssueAlertForNewIssue", () => {
  it("sends a high-severity new issue and records delivery metadata", async () => {
    const updates: unknown[] = [];
    const supabase = createFakeSupabase({ updates, recipientEmail: "ops@example.com" });
    const sendEmail = vi.fn().mockResolvedValue({ id: "email-123" });

    const result = await sendIssueAlertForNewIssue({
      supabase,
      issueId: "issue-1",
      created: true,
      draft,
      context,
      sendEmail,
    });

    expect(result).toEqual({ status: "sent", deliveryId: "email-123" });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
        idempotencyKey: "issue-alert:issue-1",
        subject: "[Tuesday] High issue for Harbor Legal: Risk router returned HTTP 500",
      }),
    );
    expect(updates).toContainEqual(
      expect.objectContaining({
        alert_delivery_id: "email-123",
        alert_error: null,
      }),
    );
  });

  it("does not send repeat high-severity issues", async () => {
    const sendEmail = vi.fn();
    const result = await sendIssueAlertForNewIssue({
      supabase: createFakeSupabase({ updates: [], recipientEmail: "ops@example.com" }),
      issueId: "issue-1",
      created: false,
      draft,
      context,
      sendEmail,
    });

    expect(result).toEqual({ status: "skipped", reason: "policy" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("records a skipped alert when the client has no report recipient", async () => {
    const updates: unknown[] = [];
    const sendEmail = vi.fn();

    const result = await sendIssueAlertForNewIssue({
      supabase: createFakeSupabase({ updates, recipientEmail: null }),
      issueId: "issue-1",
      created: true,
      draft,
      context,
      sendEmail,
    });

    expect(result).toEqual({ status: "skipped", reason: "missing_recipient" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updates).toContainEqual(
      expect.objectContaining({
        alert_error: "Client report recipient email is missing.",
      }),
    );
  });

  it("redacts provider errors before storing and returning alert failures", async () => {
    const updates: unknown[] = [];
    const sendEmail = vi
      .fn()
      .mockRejectedValue(new Error("Resend failed for Bearer secret_123 and token=abc123"));

    const result = await sendIssueAlertForNewIssue({
      supabase: createFakeSupabase({ updates, recipientEmail: "ops@example.com" }),
      issueId: "issue-1",
      created: true,
      draft,
      context,
      sendEmail,
    });

    expect(result).toEqual({
      status: "failed",
      error: "Resend failed for Bearer [redacted] and token=[redacted]",
    });
    expect(updates).toContainEqual(
      expect.objectContaining({
        alert_error: "Resend failed for Bearer [redacted] and token=[redacted]",
      }),
    );
  });

  it("sanitizes client lookup internals before recording alert failures", async () => {
    const updates: unknown[] = [];

    const result = await sendIssueAlertForNewIssue({
      supabase: createFakeSupabase({
        updates,
        clientError: { message: "client row hidden by RLS" },
      }),
      issueId: "issue-1",
      created: true,
      draft,
      context,
      sendEmail: vi.fn(),
    });

    expect(result).toEqual({ status: "failed", error: "Issue alert email failed." });
    expect(updates).toContainEqual(expect.objectContaining({ alert_error: "Issue alert email failed." }));
  });

  it("records missing client rows with the fallback alert error", async () => {
    const updates: unknown[] = [];

    const result = await sendIssueAlertForNewIssue({
      supabase: createFakeSupabase({
        updates,
        clientData: null,
      }),
      issueId: "issue-1",
      created: true,
      draft,
      context,
      sendEmail: vi.fn(),
    });

    expect(result).toEqual({ status: "failed", error: "Client could not be loaded for alert email." });
    expect(updates).toContainEqual(
      expect.objectContaining({ alert_error: "Client could not be loaded for alert email." }),
    );
  });

  it("normalizes non-Error provider failures", async () => {
    const updates: unknown[] = [];
    const result = await sendIssueAlertForNewIssue({
      supabase: createFakeSupabase({ updates, recipientEmail: "ops@example.com" }),
      issueId: "issue-1",
      created: true,
      draft,
      context,
      sendEmail: vi.fn().mockRejectedValue({ message: "provider object" }),
    });

    expect(result).toEqual({ status: "failed", error: "Issue alert email failed." });
    expect(updates).toContainEqual(expect.objectContaining({ alert_error: "Issue alert email failed." }));
  });
});

function createFakeSupabase({
  updates,
  recipientEmail,
  clientData,
  clientError = null,
}: {
  updates: unknown[];
  recipientEmail?: string | null;
  clientData?: { name: string; report_recipient_email: string | null } | null;
  clientError?: { message: string } | null;
}) {
  return {
    from(table: string) {
      if (table === "clients") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return {
              data: clientError
                ? null
                : clientData !== undefined
                  ? clientData
                  : {
                      name: "Harbor Legal",
                      report_recipient_email: recipientEmail,
                    },
              error: clientError,
            };
          },
        };
      }

      return {
        update(payload: unknown) {
          updates.push(payload);
          return this;
        },
        eq() {
          return this;
        },
      };
    },
  } as never;
}
