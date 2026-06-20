import { describe, expect, it } from "vitest";
import { validatePasswordCredentials } from "./password";

describe("validatePasswordCredentials", () => {
  it("accepts a confirmed password that meets the sign-up rules", () => {
    expect(
      validatePasswordCredentials({
        password: "Tuesday-2026!",
        confirmPassword: "Tuesday-2026!",
      }),
    ).toEqual({ success: true, password: "Tuesday-2026!" });
  });

  it("rejects mismatched confirmation values", () => {
    expect(
      validatePasswordCredentials({
        password: "Tuesday-2026!",
        confirmPassword: "Tuesday-2027!",
      }),
    ).toEqual({
      success: false,
      message: "Password and confirmation must match.",
    });
  });

  it.each([
    "short-1A!",
    "tuesday-2026!",
    "TUESDAY-2026!",
    "TuesdayRules!",
    "Tuesday2026",
  ])("rejects weak password %s", (password) => {
    expect(validatePasswordCredentials({ password, confirmPassword: password })).toEqual({
      success: false,
      message:
        "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    });
  });
});
