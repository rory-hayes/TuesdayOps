import {
  formatEmailAddress,
  getEmailDomain,
  normalizeEmailAddress,
  parseEmailAddress,
} from "@/lib/email/address";
import { getResendFromEmail } from "@/lib/env";

export type ReportEmailAgencySettings = {
  name: string;
  reportSenderName?: string;
  reportSenderEmail?: string;
  reportReplyToEmail?: string;
  reportSenderDomain?: string;
  reportSenderDomainStatus?: "pending" | "verified" | "failed";
};

export type ReportEmailIdentity = {
  from: string;
  fromEmail: string;
  replyTo?: string;
  senderName: string;
  senderDomain: string;
  senderDomainStatus: "pending" | "verified" | "failed";
  usingFallbackSender: boolean;
};

export function buildReportEmailIdentity(agency: ReportEmailAgencySettings): ReportEmailIdentity {
  const platformSender = parseEmailAddress(getResendFromEmail());
  const verifiedDomain = getVerifiedSenderDomain(platformSender.email);
  const senderName = agency.reportSenderName?.trim() || agency.name || platformSender.name || "MaintainFlow Reports";
  const configuredSenderEmail = agency.reportSenderEmail
    ? normalizeEmailAddress(agency.reportSenderEmail)
    : platformSender.email;
  const configuredSenderDomain = getEmailDomain(configuredSenderEmail);
  const configuredStatus =
    agency.reportSenderDomainStatus ?? (configuredSenderDomain === verifiedDomain ? "verified" : "pending");
  const canUseConfiguredSender =
    configuredStatus === "verified" &&
    configuredSenderDomain === verifiedDomain;
  const fromEmail = canUseConfiguredSender && configuredSenderEmail
    ? configuredSenderEmail
    : platformSender.email;
  const fallbackReplyTo =
    !canUseConfiguredSender && configuredSenderEmail
      ? configuredSenderEmail
      : undefined;
  const replyTo = agency.reportReplyToEmail
    ? normalizeEmailAddress(agency.reportReplyToEmail)
    : fallbackReplyTo;

  return {
    from: formatEmailAddress({ email: fromEmail, name: senderName }),
    fromEmail,
    replyTo,
    senderName,
    senderDomain: configuredSenderDomain,
    senderDomainStatus: configuredStatus,
    usingFallbackSender: !canUseConfiguredSender,
  };
}

export function getVerifiedSenderDomain(defaultSenderEmail: string): string {
  return (process.env.RESEND_VERIFIED_SENDER_DOMAIN?.trim().toLowerCase() || getEmailDomain(defaultSenderEmail));
}
