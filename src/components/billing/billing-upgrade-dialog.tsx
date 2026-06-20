"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CreditCard, X } from "lucide-react";
import { AgencyPlusContactDialog } from "@/components/billing/agency-plus-contact-dialog";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { PlanLimitUpgradePrompt } from "@/lib/billing/upgrade";

type BillingUpgradeDialogProps = {
  prompt?: PlanLimitUpgradePrompt;
  checkoutAction: (formData: FormData) => void | Promise<void>;
  agencyPlusContactAction: (formData: FormData) => void | Promise<void>;
  defaultContactName: string;
  defaultContactEmail: string;
};

export function BillingUpgradeDialog({
  prompt,
  checkoutAction,
  agencyPlusContactAction,
  defaultContactName,
  defaultContactEmail,
}: BillingUpgradeDialogProps) {
  if (!prompt) {
    return null;
  }

  return (
    <BillingUpgradeDialogContent
      key={`${prompt.recommendedPlanKey}-${prompt.usageLabel}`}
      prompt={prompt}
      checkoutAction={checkoutAction}
      agencyPlusContactAction={agencyPlusContactAction}
      defaultContactName={defaultContactName}
      defaultContactEmail={defaultContactEmail}
    />
  );
}

function BillingUpgradeDialogContent({
  prompt,
  checkoutAction,
  agencyPlusContactAction,
  defaultContactName,
  defaultContactEmail,
}: Required<BillingUpgradeDialogProps>) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
      <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto px-4 py-4 sm:py-8">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl ring-1 ring-zinc-950/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm/6 font-medium text-zinc-500">Billing limit</p>
              <DialogTitle className="mt-1 text-xl/7 font-semibold text-zinc-950">
                {prompt.title}
              </DialogTitle>
              <p className="mt-2 text-sm/6 text-zinc-500">{prompt.description}</p>
            </div>
            <button
              type="button"
              aria-label="Close billing upgrade"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950"
              onClick={() => setOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm/6 font-medium text-zinc-500">Current usage</span>
              <span className="text-sm/6 font-semibold text-zinc-950">{prompt.usageLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm/6 font-medium text-zinc-500">{prompt.recommendedPlanName}</span>
              <span className="text-right text-sm/6 font-semibold text-zinc-950">
                {prompt.recommendedPlanLimitLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/settings"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-950/10 bg-white px-3.5 text-sm/6 font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
            >
              Compare plans
            </Link>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Stay here
            </Button>
            {prompt.recommendedPlanKey === "agency_plus" ? (
              <AgencyPlusContactDialog
                action={agencyPlusContactAction}
                defaultContactName={defaultContactName}
                defaultContactEmail={defaultContactEmail}
              />
            ) : (
              <form action={checkoutAction}>
                <input type="hidden" name="plan" value={prompt.recommendedPlanKey} />
                <FormSubmitButton type="submit" pendingLabel="Opening billing...">
                  <CreditCard size={15} aria-hidden="true" />
                  {prompt.ctaLabel}
                </FormSubmitButton>
              </form>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
