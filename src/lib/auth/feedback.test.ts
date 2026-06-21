import { describe, expect, it } from "vitest";
import {
  formatAgencyError,
  formatEmailVerificationCallbackError,
  formatOAuthCallbackError,
  formatOAuthError,
  formatPasswordResetError,
  formatSignInError,
  formatSignUpError,
} from "@/lib/auth/feedback";

describe("auth feedback formatting", () => {
  it("keeps sign-in failures generic and free of secret-like fragments", () => {
    const message = formatSignInError(
      new Error("Invalid login credentials for ops@example.com with token=abc123"),
    );

    expect(message).toBe("We could not find an active account for that email and password. Check the details or create an account first.");
    expect(message).not.toContain("ops@example.com");
    expect(message).not.toContain("abc123");
  });

  it("maps common sign-up provider errors to safe customer-facing copy", () => {
    expect(formatSignUpError(new Error("User already registered: rory@example.com token=abc123"))).toBe(
      "An account with this email already exists. Sign in instead, or reset your password.",
    );
    expect(formatSignUpError(new Error("Database error saving new user with SUPABASE_SECRET_KEY=abc123"))).toBe(
      "We could not create the account. Check the email and password requirements, then try again.",
    );
  });

  it("keeps OAuth provider startup failures generic", () => {
    const message = formatOAuthError(
      new Error("Google OAuth failed for ops@example.com with access_token=abc123"),
    );

    expect(message).toBe("Google sign-in could not be started. Refresh the page and try again.");
    expect(message).not.toContain("ops@example.com");
    expect(message).not.toContain("abc123");
  });

  it("maps Google callback failures to self-triage copy without provider details", () => {
    expect(formatOAuthCallbackError(new Error("user not found for ops@example.com token=abc123"), "sign-in")).toBe(
      "No account is linked to that Google profile yet. Create an account first, then continue with Google.",
    );
    expect(formatOAuthCallbackError(new Error("access_denied: user cancelled"), "sign-up")).toBe(
      "Google sign-in was cancelled. Choose Continue with Google to try again.",
    );
    expect(formatOAuthCallbackError(new Error("invalid_grant: expired code"), "sign-in")).toBe(
      "That sign-in link expired. Start Google sign-in again.",
    );
  });

  it("maps email verification callback failures without Google-specific copy", () => {
    expect(formatEmailVerificationCallbackError(new Error("invalid_grant: expired code"))).toBe(
      "That verification link expired. Sign up again with the same email to request a new one.",
    );
    expect(
      formatEmailVerificationCallbackError(
        new Error("Verification failed for ops@example.com token_hash=abc123"),
      ),
    ).toBe(
      "Email verification could not be completed. Use the latest verification link or sign up again to request a new one.",
    );
  });

  it("maps workspace duplicate-slug errors without exposing database internals", () => {
    const message = formatAgencyError(
      new Error('duplicate key value violates unique constraint "agencies_slug_key" token=abc123'),
    );

    expect(message).toBe("That workspace slug is already in use. Try another slug.");
    expect(message).not.toContain("agencies_slug_key");
    expect(message).not.toContain("abc123");
  });

  it("keeps password reset provider failures generic", () => {
    const message = formatPasswordResetError(
      new Error("Recovery failed for ops@example.com with token_hash=abc123 and SUPABASE_SECRET_KEY=bad"),
    );

    expect(message).toBe("Password reset could not be completed. Request a new reset link and try again.");
    expect(message).not.toContain("ops@example.com");
    expect(message).not.toContain("abc123");
    expect(message).not.toContain("SUPABASE_SECRET_KEY");
  });
});
