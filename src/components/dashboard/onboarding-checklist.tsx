"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ArrowRight, CheckCircle2, Circle, PlayCircle, X } from "lucide-react";
import { buildOnboardingProgress, type OnboardingStep } from "@/lib/onboarding/progress";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type OnboardingChecklistProps = {
  data: TuesdayOpsSeedData;
};

export function OnboardingChecklist({ data }: OnboardingChecklistProps) {
  const progress = buildOnboardingProgress(data);
  const [guideOpen, setGuideOpen] = useState(false);
  const nextStep = progress.nextStep ?? progress.steps.at(-1);
  const storageKey = `tuesdayops:onboarding-guide-dismissed:${data.agency.id}`;

  useEffect(() => {
    let dismissed = false;

    try {
      dismissed = window.localStorage.getItem(storageKey) === "true";
    } catch {
      dismissed = false;
    }

    if (progress.complete || dismissed) {
      return;
    }

    const openTimer = window.setTimeout(() => setGuideOpen(true), 0);

    return () => window.clearTimeout(openTimer);
  }, [progress.complete, storageKey]);

  function closeGuide() {
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Dismissal persistence is a convenience; the modal still needs to close.
    }

    setGuideOpen(false);
  }

  if (!nextStep) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Activation path</p>
            <h3 className="mt-1 text-lg font-semibold">Set up your first workflow proof</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Move through the agency, client, workflow, check, and report loop with one clear next step.
            </p>
          </div>
          <div className="min-w-[180px]">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                {progress.completedCount} of {progress.totalCount}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
          <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <PlayCircle size={16} aria-hidden="true" />
              {progress.complete ? "Proof loop ready" : "Next best action"}
            </div>
            <h4 className="mt-3 text-base font-semibold text-foreground">
              {progress.complete ? "Review your monthly report proof" : nextStep.label}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {progress.complete
                ? "Your core monitoring loop has source data for client-facing proof of work."
                : getStepPrompt(nextStep)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={nextStep.href}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
              >
                {getActionLabel(nextStep)}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-950/10 bg-white px-3.5 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-50"
                onClick={() => setGuideOpen(true)}
              >
                Open guide
              </button>
            </div>
          </section>

          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {progress.steps.map((step) => (
              <ActivationStep key={step.id} step={step} active={step.id === progress.nextStep?.id} />
            ))}
          </ol>
        </CardContent>
      </Card>

      <OnboardingGuide
        open={guideOpen}
        onClose={closeGuide}
        steps={progress.steps}
        nextStep={nextStep}
        complete={progress.complete}
      />
    </>
  );
}

function ActivationStep({ step, active }: { step: OnboardingStep; active: boolean }) {
  const Icon = step.complete ? CheckCircle2 : Circle;

  return (
    <li>
      <Link
        href={step.href}
        className={`block h-full rounded-lg border p-3 transition-colors ${
          active
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-background hover:border-primary/40 hover:bg-muted"
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon
            size={17}
            aria-hidden="true"
            className={step.complete ? "text-success" : active ? "text-primary" : "text-muted-foreground"}
          />
          <span className="text-sm font-medium">{step.label}</span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
      </Link>
    </li>
  );
}

function OnboardingGuide({
  open,
  onClose,
  steps,
  nextStep,
  complete,
}: {
  open: boolean;
  onClose: () => void;
  steps: OnboardingStep[];
  nextStep: OnboardingStep;
  complete: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
      <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto px-4 py-8">
        <DialogPanel className="w-full max-w-2xl rounded-xl bg-white shadow-xl ring-1 ring-zinc-950/10">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-950/10 p-6">
            <div>
              <p className="text-sm font-medium text-primary">First workspace guide</p>
              <DialogTitle className="mt-1 text-xl font-semibold text-zinc-950">
                {complete ? "Your proof loop is ready" : "Finish the first proof loop"}
              </DialogTitle>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                TuesdayOps works best once one client workflow has a saved check run and a report draft.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close onboarding guide"
              className="grid size-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="grid gap-5 p-6">
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-primary">
                {complete ? "Ready to review" : "Start here"}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                {complete ? "Review report proof" : nextStep.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {complete ? "Use the report area to review the latest client-facing summary." : getStepPrompt(nextStep)}
              </p>
              <Link
                href={nextStep.href}
                className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
              >
                {getActionLabel(nextStep)}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </section>

            <ol className="grid gap-2">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    step.id === nextStep.id && !complete
                      ? "border-primary/40 bg-primary/5"
                      : "border-zinc-950/10 bg-white"
                  }`}
                >
                  {step.complete ? (
                    <CheckCircle2 size={18} className="mt-0.5 text-success" aria-hidden="true" />
                  ) : (
                    <Circle
                      size={18}
                      className={step.id === nextStep.id ? "mt-0.5 text-primary" : "mt-0.5 text-zinc-400"}
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-950">{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function getActionLabel(step: OnboardingStep): string {
  const labels: Record<OnboardingStep["id"], string> = {
    agency: "Review settings",
    client: "Add client",
    workflow: "Add workflow",
    check_run: "Run check",
    report: "Create report",
  };

  return labels[step.id];
}

function getStepPrompt(step: OnboardingStep): string {
  const prompts: Record<OnboardingStep["id"], string> = {
    agency: "Confirm the workspace details that will appear across the app.",
    client: "Add one retained client so workflows, issues, and reports have the correct owner.",
    workflow: "Import or manually add the first endpoint you want to monitor for that client.",
    check_run: "Open the workflow and run the health check once so there is real history to report.",
    report: "Generate the first report draft from stored check runs and issue records.",
  };

  return prompts[step.id];
}
