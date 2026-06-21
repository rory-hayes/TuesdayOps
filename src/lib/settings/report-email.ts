"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getEmailDomain,
  isPublicEmailDomain,
  normalizeEmailAddress,
  parseEmailAddress,
} from "@/lib/email/address";
import { sendResendEmail } from "@/lib/alerts/resend";
import { requireWorkspace } from "@/lib/auth/workspace";
import { buildReportEmailIdentity, getVerifiedSenderDomain } from "@/lib/reports/email-identity";
import { formatReportSendError } from "@/lib/reports/send-feedback";
import { formatActionError } from "@/lib/server-actions/feedback";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendFromEmail } from "@/lib/env";

const reportEmailSettingsSchema = z.object({
  senderName: z.string().trim().min(2).max(80),
  senderEmail: z.string().trim().email(),
  replyToEmail: z.string().trim().email().optional().or(z.literal("")),
});

const testEmailSchema = z.object({
  testRecipientEmail: z.string().trim().email(),
});

export async function updateReportEmailSettingsAction(formData: FormData) {
  const parsed = reportEmailSettingsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/settings?billingError=${encodeURIComponent("Check the sender name, sender email, and reply-to email before saving.")}`);
  }

  const workspace = await requireWorkspace();

  if (!canManageReportEmailSettings(workspace.role)) {
    redirect(`/settings?billingError=${encodeURIComponent("Only workspace owners and admins can update report email settings.")}`);
  }

  const senderEmail = normalizeEmailAddress(parsed.data.senderEmail);
  const senderDomain = getEmailDomain(senderEmail);

  if (isPublicEmailDomain(senderDomain)) {
    redirect(
      `/settings?billingError=${encodeURIComponent("Use a verified business domain for the sender email. Put Gmail or Outlook addresses in Reply-To instead.")}`,
    );
  }

  const platformSender = parseEmailAddress(getResendFromEmail());
  const verifiedDomain = getVerifiedSenderDomain(platformSender.email);
  const senderDomainStatus = senderDomain === verifiedDomain ? "verified" : "pending";
  const replyToEmail = parsed.data.replyToEmail
    ? normalizeEmailAddress(parsed.data.replyToEmail)
    : null;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("agencies")
    .update({
      report_sender_name: parsed.data.senderName,
      report_sender_email: senderEmail,
      report_reply_to_email: replyToEmail,
      report_sender_domain: senderDomain,
      report_sender_domain_status: senderDomainStatus,
    })
    .eq("id", workspace.agency.id);

  if (error) {
    redirect(`/settings?billingError=${encodeURIComponent(formatActionError(error, "Report email settings could not be saved. Try again or contact support."))}`);
  }

  revalidatePath("/settings");
  redirect(`/settings?billingNotice=${encodeURIComponent("Report email settings saved.")}`);
}

export async function sendReportEmailTestAction(formData: FormData) {
  const parsed = testEmailSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/settings?billingError=${encodeURIComponent("Enter a valid test recipient email.")}`);
  }

  const workspace = await requireWorkspace();

  if (!canManageReportEmailSettings(workspace.role)) {
    redirect(`/settings?billingError=${encodeURIComponent("Only workspace owners and admins can send report email tests.")}`);
  }

  try {
    const identity = buildReportEmailIdentity(workspace.agency);
    const recipient = normalizeEmailAddress(parsed.data.testRecipientEmail);

    await sendResendEmail({
      from: identity.from,
      replyTo: identity.replyTo,
      to: recipient,
      subject: "MaintainFlow report email test",
      text: [
        "This is a MaintainFlow report email test.",
        "",
        `From: ${identity.from}`,
        identity.replyTo ? `Reply-To: ${identity.replyTo}` : "Reply-To: not set",
        "",
        "If this arrived in the expected inbox, report email delivery is configured.",
      ].join("\n"),
      html: [
        "<p>This is a MaintainFlow report email test.</p>",
        "<ul>",
        `<li><strong>From:</strong> ${escapeHtml(identity.from)}</li>`,
        `<li><strong>Reply-To:</strong> ${escapeHtml(identity.replyTo ?? "not set")}</li>`,
        "</ul>",
        "<p>If this arrived in the expected inbox, report email delivery is configured.</p>",
      ].join(""),
      idempotencyKey: `report-email-test:${workspace.agency.id}:${workspace.user.id}:${Date.now()}`,
    });
  } catch (error) {
    redirect(`/settings?billingError=${encodeURIComponent(formatReportSendError(error))}`);
  }

  redirect(`/settings?billingNotice=${encodeURIComponent("Report test email sent.")}`);
}

function canManageReportEmailSettings(role: string): boolean {
  return role === "owner" || role === "admin";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
