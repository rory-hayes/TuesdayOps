"use client";

import { useState } from "react";
import { AuthPasswordField, PASSWORD_PATTERN } from "@/components/auth/auth-form-fields";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { ValidatedForm } from "@/components/ui/validated-form";
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/password";

export function ResetPasswordForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword && password !== confirmPassword
    ? "Passwords do not match."
    : "";

  return (
    <ValidatedForm
      action={action}
      aria-label="Update Maintain Flow password"
      className="grid gap-6"
    >
      <AuthPasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        minLength={12}
        pattern={PASSWORD_PATTERN}
        title={PASSWORD_REQUIREMENTS}
        description={PASSWORD_REQUIREMENTS}
        value={password}
        onValueChange={setPassword}
      />
      <AuthPasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        minLength={12}
        value={confirmPassword}
        onValueChange={setConfirmPassword}
        customValidity={mismatch}
      />
      <FormSubmitButton type="submit" className="w-full" pendingLabel="Updating password...">
        Update password
      </FormSubmitButton>
    </ValidatedForm>
  );
}
