"use client";

import { useState } from "react";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FieldError, ValidatedForm } from "@/components/ui/validated-form";
import { SLUG_FORMAT_MESSAGE, createSlug } from "@/lib/domain/slug";

type AgencyOnboardingFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function AgencyOnboardingForm({ action }: AgencyOnboardingFormProps) {
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <ValidatedForm
      action={action}
      aria-label="Create agency workspace"
      className="grid gap-6"
    >
      <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
        Agency name
        <input
          required
          name="name"
          aria-label="Agency name"
          minLength={2}
          maxLength={80}
          onChange={(event) => {
            const nextName = event.target.value;

            if (!slugEdited) {
              setSlug(createSlug(nextName, ""));
            }
          }}
          placeholder="Your agency"
          data-field-label="Agency name"
          className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
        />
        <FieldError name="name" />
      </label>
      <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
        Slug
        <input
          name="slug"
          aria-label="Slug"
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          aria-describedby="agency-slug-help"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
          }}
          placeholder="your-agency"
          title={SLUG_FORMAT_MESSAGE}
          data-field-label="Slug"
          className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
        />
        <span id="agency-slug-help" className="text-xs/5 font-normal text-zinc-500">
          {SLUG_FORMAT_MESSAGE}
        </span>
        <FieldError name="slug" />
      </label>
      <FormSubmitButton type="submit" className="w-full" pendingLabel="Creating...">
        Create workspace
      </FormSubmitButton>
    </ValidatedForm>
  );
}
