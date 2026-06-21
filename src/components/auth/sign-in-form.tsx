"use client";

import { useState, type FormEvent } from "react";
import { AuthInputField, AuthPasswordField } from "@/components/auth/auth-fields";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { EMAIL_FORMAT_ERROR, EMAIL_FORMAT_HELP, isAuthEmailAddress } from "@/lib/auth/email";

type SignInFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function SignInForm({ action }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const emailError = getVisibleEmailError(email, emailTouched, submitAttempted);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setSubmitAttempted(true);

    if (validateEmail(email)) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      aria-label="Sign in to Maintain Flow"
      noValidate
      className="grid gap-6"
    >
      <AuthInputField
        id="sign-in-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setEmailTouched(true);
        }}
        description={EMAIL_FORMAT_HELP}
        error={emailError}
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

function getVisibleEmailError(email: string, touched: boolean, submitAttempted: boolean) {
  if (!touched && !submitAttempted) {
    return undefined;
  }

  return validateEmail(email);
}

function validateEmail(email: string) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return "Email is required.";
  }

  if (!isAuthEmailAddress(trimmedEmail)) {
    return EMAIL_FORMAT_ERROR;
  }

  return undefined;
}
