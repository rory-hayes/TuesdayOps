type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

export function getWorkflowAuthEncryptionKey(): string | undefined {
  return process.env.WORKFLOW_AUTH_ENCRYPTION_KEY;
}

export function getSupabaseSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. This key is required for server-side background jobs.");
  }

  return secretKey;
}

export function getSchedulerSecret(): string {
  const schedulerSecret = process.env.SCHEDULER_SECRET;

  if (!schedulerSecret) {
    throw new Error("Missing SCHEDULER_SECRET. This secret is required for protected scheduler triggers.");
  }

  return schedulerSecret;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY. This key is required for email alerts.");
  }

  return apiKey;
}

export function getResendFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("Missing RESEND_FROM_EMAIL. This sender is required for email alerts.");
  }

  return fromEmail;
}
