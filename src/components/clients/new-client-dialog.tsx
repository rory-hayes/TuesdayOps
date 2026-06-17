"use client";

import { useState, useSyncExternalStore } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { cn } from "@/lib/utils";

type NewClientDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  trigger?: "button" | "icon";
  className?: string;
};

const subscribeHydration = () => () => {};
const clientHydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

export function NewClientDialog({ action, trigger = "button", className }: NewClientDialogProps) {
  const [open, setOpen] = useState(false);
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientHydratedSnapshot,
    serverHydratedSnapshot,
  );

  return (
    <>
      {trigger === "icon" ? (
        <button
          type="button"
          aria-label="Add client"
          className={cn(
            "grid size-6 place-items-center rounded-md text-zinc-600 transition hover:bg-zinc-950/5 hover:text-zinc-950 disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
          disabled={!ready}
          onClick={() => setOpen(true)}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <Button type="button" size="sm" disabled={!ready} onClick={() => setOpen(true)} className={className}>
          <PlusIcon aria-hidden="true" />
          New client
        </Button>
      )}

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
        <div className="fixed inset-0 flex w-screen items-start justify-center overflow-y-auto px-4 py-8 sm:py-16">
          <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl ring-1 ring-zinc-950/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-base/7 font-semibold text-zinc-950">
                  New client
                </DialogTitle>
                <p className="mt-1 text-sm/6 text-zinc-500">
                  Create a retained client before registering workflows and checks.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close new client"
                className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950"
                onClick={() => setOpen(false)}
              >
                <XMarkIcon className="size-5" aria-hidden="true" />
              </button>
            </div>

            <form action={action} aria-label="Create client" noValidate className="mt-6 grid gap-5">
              <Field label="Client name" name="name" placeholder="Client company" required minLength={2} maxLength={100} />
              <Field
                label="Slug"
                name="slug"
                placeholder="client-company"
                maxLength={100}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
              <Field label="Industry" name="industry" placeholder="Operations" required minLength={2} maxLength={80} />
              <Field
                label="Report email"
                name="reportRecipientEmail"
                type="email"
                placeholder="reports@client.example"
                required
              />
              <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={1000}
                  placeholder="Monitoring scope and reporting notes"
                  className="rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <FormSubmitButton type="submit" pendingLabel="Adding...">
                  <PlusIcon aria-hidden="true" />
                  Add client
                </FormSubmitButton>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  minLength,
  maxLength,
  pattern,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}
