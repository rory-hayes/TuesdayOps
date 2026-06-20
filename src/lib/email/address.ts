const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export type ParsedEmailAddress = {
  name?: string;
  email: string;
};

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function parseEmailAddress(value: string): ParsedEmailAddress {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)<([^<>]+)>$/);
  const rawName = match?.[1]?.trim();
  const email = normalizeEmailAddress(match?.[2] ?? trimmed);

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Email address is not valid.");
  }

  return {
    email,
    name: rawName ? sanitizeEmailDisplayName(rawName) : undefined,
  };
}

export function formatEmailAddress({
  email,
  name,
}: {
  email: string;
  name?: string;
}): string {
  const normalizedEmail = normalizeEmailAddress(email);

  if (!name?.trim()) {
    return normalizedEmail;
  }

  return `${sanitizeEmailDisplayName(name)} <${normalizedEmail}>`;
}

export function getEmailDomain(email: string): string {
  return normalizeEmailAddress(email).split("@")[1] ?? "";
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
}

function sanitizeEmailDisplayName(value: string): string {
  return value
    .replace(/[<>\r\n"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
