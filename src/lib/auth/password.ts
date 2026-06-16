export const PASSWORD_REQUIREMENTS =
  "Use at least 12 characters with uppercase, lowercase, number, and symbol.";

const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

type PasswordValidationResult =
  | { success: true; password: string }
  | { success: false; message: string };

export function validatePasswordCredentials(input: {
  password: unknown;
  confirmPassword: unknown;
}): PasswordValidationResult {
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!STRONG_PASSWORD_PATTERN.test(password)) {
    return {
      success: false,
      message: PASSWORD_REQUIREMENTS,
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "Password and confirmation must match.",
    };
  }

  return { success: true, password };
}
