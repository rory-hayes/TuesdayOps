import type { User } from "@supabase/supabase-js";

export const EMAIL_VERIFICATION_PENDING_NOTICE =
  "Check your inbox for the verification link before signing in.";
export const EMAIL_VERIFICATION_REQUIRED_ERROR =
  "Confirm your email before continuing. Check your inbox for the verification link.";

export function buildEmailVerificationPendingRedirect(): string {
  return `/sign-in?notice=${encodeURIComponent(EMAIL_VERIFICATION_PENDING_NOTICE)}`;
}

export function buildEmailVerificationRequiredRedirect(): string {
  return `/sign-in?error=${encodeURIComponent(EMAIL_VERIFICATION_REQUIRED_ERROR)}`;
}

export function isEmailVerificationRequired(user: User): boolean {
  return isPasswordAuthUser(user) && !hasConfirmedEmail(user);
}

function hasConfirmedEmail(user: User): boolean {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function isPasswordAuthUser(user: User): boolean {
  const primaryProvider = normalizeProvider(user.app_metadata.provider);
  const providers = collectProviders(user);

  if (primaryProvider) {
    return primaryProvider === "email";
  }

  if (!providers.has("email")) {
    return false;
  }

  return Array.from(providers).every((provider) => provider === "email");
}

function collectProviders(user: User): Set<string> {
  const providers = new Set<string>();

  for (const provider of user.app_metadata.providers ?? []) {
    const normalized = normalizeProvider(provider);

    if (normalized) {
      providers.add(normalized);
    }
  }

  for (const identity of user.identities ?? []) {
    const normalized = normalizeProvider(identity.provider);

    if (normalized) {
      providers.add(normalized);
    }
  }

  return providers;
}

function normalizeProvider(provider: unknown): string | null {
  if (typeof provider !== "string") {
    return null;
  }

  const normalized = provider.trim().toLowerCase();

  return normalized || null;
}
