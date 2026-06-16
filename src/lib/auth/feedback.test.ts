import { describe, expect, it } from "vitest";
import {
  formatAgencyError,
  formatPasswordResetError,
  formatSignInError,
  formatSignUpError,
} from "@/lib/auth/feedback";

describe("auth feedback formatting", () => {
  it("keeps sign-in failures generic and free of secret-like fragments", () => {
    const message = formatSignInError(
      new Error("Invalid login credentials for ops@example.com with token=abc123"),
    );

    expect(message).toBe("Email or password did not match an active account.");
    expect(message).not.toContain("ops@example.com");
    expect(message).not.toContain("abc123");
  });

  it("maps common sign-up provider errors to safe customer-facing copy", () => {
    expect(formatSignUpError(new Error("User already registered: rory@example.com token=abc123"))).toBe(
      "An account with this email already exists. Sign in instead.",
    );
    expect(formatSignUpError(new Error("Database error saving new user with SUPABASE_SECRET_KEY=abc123"))).toBe(
      "Account could not be created. Check the details and try again.",
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
