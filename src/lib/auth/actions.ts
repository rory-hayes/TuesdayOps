"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { validatePasswordCredentials } from "@/lib/auth/password";
import { sanitizeUserText } from "@/lib/domain/input-sanitization";
import { parseOptionalSlug } from "@/lib/domain/slug";
import {
  formatAgencyError,
  formatPasswordResetError,
  formatSignInError,
  formatSignUpError,
} from "@/lib/auth/feedback";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const authSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const signUpSchema = z.object({
  email: z.string().trim().email(),
  password: z.string(),
  confirmPassword: z.string(),
});

const resetRequestSchema = z.object({
  email: z.string().trim().email(),
});

const passwordUpdateSchema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
});

const agencySchema = z.object({
  name: z.preprocess(
    (value) => (typeof value === "string" ? sanitizeUserText(value) : value),
    z.string().min(2).max(80),
  ),
  slug: z.string().trim().max(80).optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#18181B"),
});

export async function signInAction(formData: FormData) {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/sign-in?error=${encodeURIComponent("Enter a valid email and password.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(formatSignInError(error))}`);
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/sign-up?error=${encodeURIComponent("Use a valid email and complete both password fields.")}`);
  }

  const password = validatePasswordCredentials(parsed.data);

  if (!password.success) {
    redirect(`/sign-up?error=${encodeURIComponent(password.message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: password.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/onboarding`,
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(formatSignUpError(error))}`);
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter a valid email address.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(formatPasswordResetError(error))}`);
  }

  redirect(
    `/forgot-password?notice=${encodeURIComponent(
      "If an account exists for that email, a reset link will arrive shortly.",
    )}`,
  );
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = passwordUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/reset-password?error=${encodeURIComponent("Complete both password fields.")}`);
  }

  const password = validatePasswordCredentials(parsed.data);

  if (!password.success) {
    redirect(`/reset-password?error=${encodeURIComponent(password.message)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Request a new reset link before choosing a password.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password: password.password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(formatPasswordResetError(error))}`);
  }

  await supabase.auth.signOut();
  redirect(`/sign-in?notice=${encodeURIComponent("Password updated. Sign in with your new password.")}`);
}

export async function createAgencyAction(formData: FormData) {
  const parsed = agencySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/onboarding?error=${encodeURIComponent("Add an agency name.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsedSlug = parseOptionalSlug({
    value: parsed.data.slug,
    source: parsed.data.name,
    fallback: "agency",
  });

  if (!parsedSlug.success) {
    redirect(`/onboarding?error=${encodeURIComponent(parsedSlug.message)}`);
  }

  const { error } = await supabase.rpc("create_agency_for_current_user", {
    agency_name: parsed.data.name,
    agency_slug: parsedSlug.slug,
    agency_primary_color: parsed.data.primaryColor,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(formatAgencyError(error))}`);
  }

  redirect("/");
}
