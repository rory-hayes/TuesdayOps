const SIGN_IN_ERROR = "Email or password did not match an active account.";
const SIGN_UP_ERROR = "Account could not be created. Check the details and try again.";
const EXISTING_ACCOUNT_ERROR = "An account with this email already exists. Sign in instead.";
const AGENCY_ERROR = "Workspace could not be created. Check the details and try again.";
const DUPLICATE_AGENCY_SLUG_ERROR = "That workspace slug is already in use. Try another slug.";

export function formatSignInError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }

  return SIGN_IN_ERROR;
}

export function formatSignUpError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("already registered") || message.includes("already exists")) {
    return EXISTING_ACCOUNT_ERROR;
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Try again in a few minutes.";
  }

  return SIGN_UP_ERROR;
}

export function formatAgencyError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    message.includes("already exists")
  ) {
    return DUPLICATE_AGENCY_SLUG_ERROR;
  }

  return AGENCY_ERROR;
}
