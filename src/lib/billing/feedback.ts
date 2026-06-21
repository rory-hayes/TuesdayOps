const BILLING_SETUP_ERROR =
  "Billing is not ready yet. Contact support to finish subscription setup.";
const BILLING_FALLBACK_ERROR = "Billing could not be updated. Try again or contact support.";

export function formatBillingError(error: unknown, fallback = BILLING_FALLBACK_ERROR): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim() || fallback;

  if (isBillingSetupError(message)) {
    return BILLING_SETUP_ERROR;
  }

  return sanitizeBillingError(message).slice(0, 240);
}

function isBillingSetupError(message: string): boolean {
  return (
    /^Missing [A-Z0-9_]+/.test(message) ||
    message.startsWith("Invalid NEXT_PUBLIC_APP_URL") ||
    message === "Billing is not configured."
  );
}

function sanitizeBillingError(message: string): string {
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9_]+/g, "[redacted-key]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]");
}
