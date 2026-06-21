"use client";

import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Handshake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type AgencyPlusContactDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultContactName: string;
  defaultContactEmail: string;
};

export function AgencyPlusContactDialog({
  action,
  defaultContactName,
  defaultContactEmail,
}: AgencyPlusContactDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Handshake size={15} aria-hidden="true" />
        Contact sales
      </Button>
      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
        <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto px-4 py-4 sm:py-8">
          <DialogPanel className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-950/10">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-950/10 p-6">
              <div>
                <p className="text-sm/6 font-medium text-zinc-500">Agency+</p>
                <DialogTitle className="mt-1 text-xl/7 font-semibold text-zinc-950">
                  Contact sales
                </DialogTitle>
              </div>
              <button
                type="button"
                aria-label="Close Agency+ contact form"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form action={action} className="min-h-0 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <ContactField
                  label="Contact name"
                  name="contactName"
                  defaultValue={defaultContactName}
                  autoComplete="name"
                  required
                  maxLength={120}
                />
                <ContactField
                  label="Contact email"
                  name="contactEmail"
                  type="email"
                  defaultValue={defaultContactEmail}
                  autoComplete="email"
                  required
                  maxLength={160}
                />
                <ContactField
                  label="Phone"
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={80}
                />
                <ContactField
                  label="Role"
                  name="role"
                  placeholder="Founder, ops lead, finance"
                  autoComplete="organization-title"
                  required
                  maxLength={120}
                />
                <ContactField
                  label="Expected clients"
                  name="expectedClients"
                  type="number"
                  min={1}
                  max={10000}
                  required
                />
                <ContactField
                  label="Expected workflows"
                  name="expectedWorkflows"
                  type="number"
                  min={1}
                  max={100000}
                  required
                />
                <ContactField
                  label="Timeline"
                  name="timeline"
                  placeholder="This week, this month, next quarter"
                  required
                  maxLength={120}
                />
                <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                  Configuration notes
                  <textarea
                    name="requirements"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={5}
                    placeholder="Migration needs, billing setup, security requirements, integrations, or rollout constraints."
                    className="min-h-32 resize-y rounded-md border border-border bg-card px-3 py-2 text-sm font-normal text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <FormSubmitButton type="submit" pendingLabel="Sending...">
                  <Handshake size={15} aria-hidden="true" />
                  Send request
                </FormSubmitButton>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function ContactField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  maxLength,
  min,
  max,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        autoComplete={autoComplete}
        className="h-10 rounded-md border border-border bg-card px-3 text-sm font-normal text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
