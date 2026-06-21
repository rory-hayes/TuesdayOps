export const EMAIL_FORMAT_ERROR = "Please enter a valid email address in the format user@example.com.";
export const EMAIL_FORMAT_HELP = "Use the format user@example.com. Plus addressing and subdomains are supported.";

// Mirrors Zod's browser-compatible html5Email pattern so client checks stay aligned without shipping Zod.
export const AUTH_EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isAuthEmailAddress(value: string) {
  const email = value.trim();

  if (!email) {
    return false;
  }

  if (typeof document === "undefined") {
    return AUTH_EMAIL_PATTERN.test(email);
  }

  const input = document.createElement("input");
  input.type = "email";
  input.value = email;

  return input.checkValidity();
}
