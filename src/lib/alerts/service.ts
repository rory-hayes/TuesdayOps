import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/env";
import type { IssueRunContext } from "@/lib/issues/operations";
import type { IssueDraft } from "@/lib/issues/engine";
import {
  buildIssueAlertEmail,
  redactAlertText,
  shouldSendIssueAlert,
} from "@/lib/alerts/issue-alerts";
import { sendResendEmail, type SendEmailInput } from "@/lib/alerts/resend";

type ClientAlertRow = {
  name: string;
  report_recipient_email: string | null;
};

export type IssueAlertResult =
  | { status: "sent"; deliveryId: string }
  | { status: "skipped"; reason: "policy" | "missing_recipient" }
  | { status: "failed"; error: string };

export async function sendIssueAlertForNewIssue({
  supabase,
  issueId,
  created,
  draft,
  context,
  sendEmail = sendResendEmail,
}: {
  supabase: SupabaseClient;
  issueId: string;
  created: boolean;
  draft: IssueDraft;
  context: IssueRunContext;
  sendEmail?: (input: SendEmailInput) => Promise<{ id: string }>;
}): Promise<IssueAlertResult> {
  if (!shouldSendIssueAlert({ created, severity: draft.severity })) {
    return { status: "skipped", reason: "policy" };
  }

  try {
    const client = await loadClientForAlert({ supabase, context });

    if (!client.report_recipient_email) {
      await recordAlertFailure({
        supabase,
        context,
        issueId,
        error: "Client report recipient email is missing.",
      });

      return { status: "skipped", reason: "missing_recipient" };
    }

    const email = buildIssueAlertEmail({
      issue: {
        id: issueId,
        severity: draft.severity,
        title: draft.title,
        description: draft.description,
        suggestedAction: draft.suggestedAction,
      },
      clientName: client.name,
      workflowName: context.workflowName,
      checkName: context.checkName,
      appUrl: getAppUrl(),
    });
    const delivery = await sendEmail({
      to: client.report_recipient_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      idempotencyKey: `issue-alert:${issueId}`,
    });

    await recordAlertSuccess({ supabase, context, issueId, deliveryId: delivery.id });

    return { status: "sent", deliveryId: delivery.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Issue alert email failed.";

    await recordAlertFailure({ supabase, context, issueId, error: message });

    return { status: "failed", error: redactAlertText(message).slice(0, 600) };
  }
}

async function loadClientForAlert({
  supabase,
  context,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
}) {
  const { data, error } = await supabase
    .from("clients")
    .select("name, report_recipient_email")
    .eq("agency_id", context.agencyId)
    .eq("id", context.clientId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Client could not be loaded for alert email.");
  }

  return data as ClientAlertRow;
}

async function recordAlertSuccess({
  supabase,
  context,
  issueId,
  deliveryId,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
  issueId: string;
  deliveryId: string;
}) {
  await supabase
    .from("issues")
    .update({
      alert_sent_at: new Date().toISOString(),
      alert_delivery_id: deliveryId,
      alert_error: null,
      alert_last_attempt_at: new Date().toISOString(),
    })
    .eq("agency_id", context.agencyId)
    .eq("id", issueId);
}

async function recordAlertFailure({
  supabase,
  context,
  issueId,
  error,
}: {
  supabase: SupabaseClient;
  context: IssueRunContext;
  issueId: string;
  error: string;
}) {
  await supabase
    .from("issues")
    .update({
      alert_error: redactAlertText(error).slice(0, 600),
      alert_last_attempt_at: new Date().toISOString(),
    })
    .eq("agency_id", context.agencyId)
    .eq("id", issueId);
}
