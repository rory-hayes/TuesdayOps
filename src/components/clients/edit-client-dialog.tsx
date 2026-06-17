"use client";

import { useState, useSyncExternalStore } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Archive, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { Client } from "@/lib/domain/types";

type EditClientDialogProps = {
  client: Client;
  updateAction: (formData: FormData) => void | Promise<void>;
  archiveAction: (formData: FormData) => void | Promise<void>;
};

const subscribeHydration = () => () => {};
const clientHydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

export function EditClientDialog({ client, updateAction, archiveAction }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientHydratedSnapshot,
    serverHydratedSnapshot,
  );

  return (
    <>
      <Button type="button" size="sm" variant="secondary" disabled={!ready} onClick={() => setOpen(true)}>
        <Pencil size={14} aria-hidden="true" />
        Edit
      </Button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
        <div className="fixed inset-0 flex w-screen items-start justify-center overflow-y-auto px-4 py-8 sm:py-16">
          <DialogPanel className="w-full max-w-xl rounded-xl bg-white shadow-xl ring-1 ring-zinc-950/10">
            <header className="flex items-start justify-between gap-4 border-b border-zinc-950/10 p-6">
              <div>
                <DialogTitle className="text-base/7 font-semibold text-zinc-950">
                  Edit client
                </DialogTitle>
                <p className="mt-1 text-sm/6 text-zinc-500">
                  Update the report recipient and operational notes without changing stored workflow history.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit client"
                className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form action={updateAction} aria-label={`Edit ${client.name}`} noValidate className="grid gap-5 p-6">
              <input type="hidden" name="id" value={client.id} />
              <input type="hidden" name="slug" value={client.slug} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client name" name="name" defaultValue={client.name} required minLength={2} maxLength={100} />
                <Field label="Industry" name="industry" defaultValue={client.industry} required minLength={2} maxLength={80} />
              </div>
              <Field
                label="Report email"
                name="reportRecipientEmail"
                type="email"
                defaultValue={client.reportRecipientEmail}
                required
              />
              <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  maxLength={1000}
                  defaultValue={client.notes}
                  placeholder="Monitoring scope and reporting notes"
                  className="rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="flex flex-col-reverse justify-between gap-3 border-t border-zinc-950/10 pt-5 sm:flex-row sm:items-center">
                {!client.archived ? (
                  <FormSubmitButton
                    formAction={archiveAction}
                    type="submit"
                    variant="ghost"
                    size="sm"
                    pendingLabel="Archiving..."
                    confirmMessage="Archive this client? Their workflows and reports stay stored, but they leave the active portfolio."
                  >
                    <Archive size={14} aria-hidden="true" />
                    Archive client
                  </FormSubmitButton>
                ) : (
                  <span className="text-sm text-zinc-500">This client is archived.</span>
                )}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <FormSubmitButton type="submit" pendingLabel="Saving...">
                    <Save size={14} aria-hidden="true" />
                    Save changes
                  </FormSubmitButton>
                </div>
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
  defaultValue,
  type = "text",
  required = false,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        minLength={minLength}
        maxLength={maxLength}
        className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
