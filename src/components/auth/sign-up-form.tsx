"use client";

import { useState, type FormEvent } from "react";
import { AuthInputField, AuthPasswordField } from "@/components/auth/auth-fields";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PASSWORD_REQUIREMENTS, validatePasswordCredentials } from "@/lib/auth/password";

type SignUpFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

type SignUpValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

type SignUpErrors = Partial<Record<keyof SignUpValues, string>>;
type SignUpTouched = Partial<Record<keyof SignUpValues, boolean>>;

export function SignUpForm({ action }: SignUpFormProps) {
  const [values, setValues] = useState<SignUpValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<SignUpTouched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const errors = getVisibleSignUpErrors(values, touched, submitAttempted);

  function updateValue(name: keyof SignUpValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const nextErrors = validateSignUpValues(values);
    setSubmitAttempted(true);

    if (Object.keys(nextErrors).length) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      aria-label="Create Tuesday account"
      noValidate
      className="grid gap-6"
    >
      <AuthInputField
        id="sign-up-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(event) => updateValue("email", event.target.value)}
        error={errors.email}
      />
      <AuthPasswordField
        id="sign-up-password"
        label="New password"
        name="password"
        autoComplete="new-password"
        minLength={12}
        description={PASSWORD_REQUIREMENTS}
        revealLabel="new password"
        value={values.password}
        onChange={(event) => updateValue("password", event.target.value)}
        error={errors.password}
      />
      <AuthPasswordField
        id="sign-up-confirm-password"
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        minLength={12}
        revealLabel="confirmed password"
        value={values.confirmPassword}
        onChange={(event) => updateValue("confirmPassword", event.target.value)}
        error={errors.confirmPassword}
      />
      <FormSubmitButton type="submit" className="w-full" pendingLabel="Creating...">
        Create account
      </FormSubmitButton>
    </form>
  );
}

function validateSignUpValues(values: SignUpValues): SignUpErrors {
  const errors: SignUpErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Email is required.";
  } else if (!isEmailAddress(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (
    !validatePasswordCredentials({
      password: values.password,
      confirmPassword: values.password,
    }).success
  ) {
    errors.password = PASSWORD_REQUIREMENTS;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm password is required.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Password and confirmation must match.";
  }

  return errors;
}

function getVisibleSignUpErrors(
  values: SignUpValues,
  touched: SignUpTouched,
  submitAttempted: boolean,
): SignUpErrors {
  const errors = validateSignUpValues(values);
  const visibleErrors: SignUpErrors = {};

  for (const field of Object.keys(errors) as Array<keyof SignUpErrors>) {
    if (submitAttempted || touched[field]) {
      visibleErrors[field] = errors[field];
    }
  }

  return visibleErrors;
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
