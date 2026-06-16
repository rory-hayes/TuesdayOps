"use client";

import { useState } from "react";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { SLUG_FORMAT_MESSAGE, createSlug } from "@/lib/domain/slug";

type AgencyOnboardingFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function AgencyOnboardingForm({ action }: AgencyOnboardingFormProps) {
  const [agencyName, setAgencyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form
      action={action}
      aria-label="Create agency workspace"
      noValidate
      className="grid gap-6"
    >
      <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
        Agency name
        <input
          required
          name="name"
          minLength={2}
          maxLength={80}
          value={agencyName}
          onChange={(event) => {
            const nextName = event.target.value;
            setAgencyName(nextName);

            if (!slugEdited) {
              setSlug(createSlug(nextName, ""));
            }
          }}
          placeholder="Your agency"
          className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
        />
      </label>
      <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
        Slug
        <input
          name="slug"
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          aria-describedby="agency-slug-help"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
          }}
          placeholder="your-agency"
          className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
        />
        <span id="agency-slug-help" className="text-xs/5 font-normal text-zinc-500">
          {SLUG_FORMAT_MESSAGE}
        </span>
      </label>
      <FormSubmitButton type="submit" className="w-full" pendingLabel="Creating...">
        Create workspace
      </FormSubmitButton>
    </form>
  );
}
