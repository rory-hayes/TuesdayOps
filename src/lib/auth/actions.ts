"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSlug } from "@/lib/domain/slug";
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

const resetRequestSchema = z.object({
  email: z.string().trim().email(),
});

const passwordUpdateSchema = z.object({
  password: z.string().min(8),
});

const agencySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#7C6CF2"),
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
  const parsed = authSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/sign-up?error=${encodeURIComponent("Use a valid email and a password of at least 8 characters.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
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
    redirect(`/reset-password?error=${encodeURIComponent("Use a password of at least 8 characters.")}`);
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

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

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

  const slug = createSlug(parsed.data.slug || parsed.data.name, "agency");
  const { error } = await supabase.rpc("create_agency_for_current_user", {
    agency_name: parsed.data.name,
    agency_slug: slug,
    agency_primary_color: parsed.data.primaryColor,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(formatAgencyError(error))}`);
  }

  redirect("/");
}
