"use client";

import { FormSubmitButton } from "@/components/ui/form-submit-button";

type GoogleAuthFormProps = {
  source: "sign-in" | "sign-up";
};

export function GoogleAuthForm({ source }: GoogleAuthFormProps) {
  return (
    <form action="/auth/google" method="get" aria-label="Continue with Google" className="grid gap-3">
      <input type="hidden" name="source" value={source} />
      <FormSubmitButton
        type="submit"
        variant="secondary"
        className="h-10 w-full"
        pendingLabel="Opening Google..."
      >
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-full border border-zinc-950/10 bg-white text-sm font-bold text-zinc-950"
        >
          G
        </span>
        Continue with Google
      </FormSubmitButton>
    </form>
  );
}

export function AuthDivider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-zinc-950/10" />
      <span className="text-xs/5 font-medium text-zinc-500">{label}</span>
      <span className="h-px flex-1 bg-zinc-950/10" />
    </div>
  );
}
