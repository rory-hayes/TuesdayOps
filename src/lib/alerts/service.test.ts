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
    const supabase = createFakeSupabase({ updates });
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
        subject: "[TuesdayOps] High issue for Harbor Legal: Risk router returned HTTP 500",
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
      supabase: createFakeSupabase({ updates: [] }),
      issueId: "issue-1",
      created: false,
      draft,
      context,
      sendEmail,
    });

    expect(result).toEqual({ status: "skipped", reason: "policy" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

function createFakeSupabase({ updates }: { updates: unknown[] }) {
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
              data: {
                name: "Harbor Legal",
                report_recipient_email: "ops@example.com",
              },
              error: null,
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
