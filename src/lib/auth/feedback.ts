const SIGN_IN_ERROR = "We could not find an active account for that email and password. Check the details or create an account first.";
const SIGN_UP_ERROR = "We could not create the account. Check the email and password requirements, then try again.";
const OAUTH_ERROR = "Google sign-in could not be started. Refresh the page and try again.";
const OAUTH_CALLBACK_ERROR = "Google sign-in could not be completed. Return to sign-in and try again.";
const OAUTH_SIGN_IN_ACCOUNT_MISSING_ERROR =
  "No account is linked to that Google profile yet. Create an account first, then continue with Google.";
const OAUTH_SIGN_UP_ACCOUNT_ERROR =
  "We could not create an account with that Google profile. Try email signup or contact support.";
const OAUTH_CANCELLED_ERROR = "Google sign-in was cancelled. Choose Continue with Google to try again.";
const OAUTH_EXPIRED_ERROR = "That sign-in link expired. Start Google sign-in again.";
const EXISTING_ACCOUNT_ERROR = "An account with this email already exists. Sign in instead, or reset your password.";
const AGENCY_ERROR = "Workspace could not be created. Check the workspace name and slug, then try again.";
const DUPLICATE_AGENCY_SLUG_ERROR = "That workspace slug is already in use. Try another slug.";
const PASSWORD_RESET_ERROR = "Password reset could not be completed. Request a new reset link and try again.";

type OAuthSource = "sign-in" | "sign-up";

export function formatSignInError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
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

export function formatOAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Try again in a few minutes.";
  }

  return OAUTH_ERROR;
}

export function formatOAuthCallbackError(error: unknown, source: OAuthSource = "sign-in"): string {
  const message = readErrorMessage(error).toLowerCase();

  if (!message) {
    return OAUTH_CALLBACK_ERROR;
  }

  if (message.includes("access_denied") || message.includes("cancelled") || message.includes("canceled")) {
    return OAUTH_CANCELLED_ERROR;
  }

  if (message.includes("expired") || message.includes("invalid_grant") || message.includes("invalid code")) {
    return OAUTH_EXPIRED_ERROR;
  }

  if (isMissingOAuthAccountMessage(message)) {
    return source === "sign-up" ? OAUTH_SIGN_UP_ACCOUNT_ERROR : OAUTH_SIGN_IN_ACCOUNT_MISSING_ERROR;
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Try again in a few minutes.";
  }

  return source === "sign-up"
    ? "Google account creation could not be completed. Try again, or create an account with email."
    : OAUTH_CALLBACK_ERROR;
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

export function formatPasswordResetError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Try again in a few minutes.";
  }

  return PASSWORD_RESET_ERROR;
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

function isMissingOAuthAccountMessage(message: string): boolean {
  return (
    message.includes("user not found") ||
    message.includes("account not found") ||
    message.includes("identity not found") ||
    message.includes("not registered") ||
    message.includes("no account") ||
    message.includes("no user")
  );
}
