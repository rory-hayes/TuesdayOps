import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isEmailVerificationRequired } from "@/lib/auth/email-verification";

describe("isEmailVerificationRequired", () => {
  it("requires verification for unconfirmed password-primary users", () => {
    expect(
      isEmailVerificationRequired(
        user({
          app_metadata: { provider: "email", providers: ["email"] },
          confirmation_sent_at: "2026-06-21T18:00:00Z",
        }),
      ),
    ).toBe(true);
  });

  it("allows confirmed password users", () => {
    expect(
      isEmailVerificationRequired(
        user({
          app_metadata: { provider: "email", providers: ["email"] },
          email_confirmed_at: "2026-06-21T18:01:00Z",
        }),
      ),
    ).toBe(false);
  });

  it("allows OAuth-primary users without requiring a password email timestamp", () => {
    expect(
      isEmailVerificationRequired(
        user({
          app_metadata: { provider: "google", providers: ["google"] },
          identities: [
            {
              id: "identity-1",
              user_id: "user-1",
              identity_id: "identity-1",
              provider: "google",
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("falls back to identity providers when app metadata is missing", () => {
    expect(
      isEmailVerificationRequired(
        user({
          app_metadata: {},
          identities: [
            {
              id: "identity-1",
              user_id: "user-1",
              identity_id: "identity-1",
              provider: "email",
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

function user(overrides: Partial<User>): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    email: "ops@example.com",
    created_at: "2026-06-21T18:00:00Z",
    ...overrides,
  };
}
