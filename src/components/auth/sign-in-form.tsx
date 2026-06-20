"use client";

import { AuthInputField, AuthPasswordField } from "@/components/auth/auth-fields";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type SignInFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function SignInForm({ action }: SignInFormProps) {
  return (
    <form action={action} aria-label="Sign in to Maintain Flow" noValidate className="grid gap-6">
      <AuthInputField
        id="sign-in-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
      />
      <AuthPasswordField
        id="sign-in-password"
        label="Password"
        name="password"
        autoComplete="current-password"
        minLength={8}
        revealLabel="password"
      />
      <FormSubmitButton type="submit" className="w-full" pendingLabel="Signing in...">
        Sign in
      </FormSubmitButton>
    </form>
  );
}
