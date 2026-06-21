import { formatActionError } from "@/lib/server-actions/feedback";

const EMAIL_NOT_CONFIGURED_MESSAGE =
  "Report email is not ready yet. Contact support to finish email setup.";
const EMAIL_DELIVERY_FAILED_MESSAGE =
  "Report email could not be delivered. Check the recipient address and try again.";
const REPORT_SEND_FALLBACK = "Report email could not be sent. Try again or contact support.";

export function buildReportSendRedirect({
  reportId,
  status,
  message,
}: {
  reportId: string;
  status: "sent" | "failed";
  message?: string;
}) {
  if (status === "failed") {
    return `/reports/${reportId}?error=${encodeURIComponent(formatReportSendError(message))}`;
  }

  return `/reports/${reportId}?notice=${encodeURIComponent("Report email sent.")}`;
}

export function formatReportSendError(error: unknown): string {
  const message = readErrorMessage(error);

  if (!message) {
    return REPORT_SEND_FALLBACK;
  }

  if (/recipient email is missing/i.test(message)) {
    return "Add a report recipient email for this client before sending.";
  }

  if (
    /\bRESEND_[A-Z0-9_]+\b/.test(message) ||
    /missing .*email/i.test(message) ||
    /missing .*(key|secret|token)/i.test(message)
  ) {
    return EMAIL_NOT_CONFIGURED_MESSAGE;
  }

  if (/resend|email|delivery|recipient/i.test(message)) {
    return EMAIL_DELIVERY_FAILED_MESSAGE;
  }

  const formatted = formatActionError(new Error(message), REPORT_SEND_FALLBACK);

  if (containsSecretShape(formatted)) {
    return REPORT_SEND_FALLBACK;
  }

  return formatted;
}

function readErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  return "";
}

function containsSecretShape(value: string): boolean {
  return (
    /\b[A-Z0-9_]+_(?:KEY|SECRET|TOKEN|DSN)\b/.test(value) ||
    /Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(value) ||
    /(api[_-]?key|token|secret|password)\s*[:=]/i.test(value)
  );
}
