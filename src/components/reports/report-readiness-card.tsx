"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { ReportSummary } from "@/lib/domain/types";
import type { ReportQuality } from "@/lib/reports/quality";
import {
  buildReportReadinessResolutionItems,
  type ReportReadinessResolutionItem,
} from "@/lib/reports/readiness-resolution";

type ReportReadinessCardProps = {
  quality: ReportQuality;
  report: Pick<ReportSummary, "clientId" | "clientName" | "period">;
  regenerateReportAction: (formData: FormData) => void | Promise<void>;
  frame?: "card" | "panel";
};

export function ReportReadinessCard({
  quality,
  report,
  regenerateReportAction,
  frame = "card",
}: ReportReadinessCardProps) {
  const [open, setOpen] = useState(false);

  if (quality.score === 100) {
    return null;
  }

  const attentionItems = buildReportReadinessResolutionItems({
    quality,
    clientId: report.clientId,
  });
  const checksContent = (
    <div className="grid gap-2 md:grid-cols-2">
      {quality.checks.map((check) => (
        <div key={check.id} className="rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">{check.label}</p>
            <Badge variant={getCheckBadgeVariant(check.status)}>{check.status}</Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{check.detail}</p>
        </div>
      ))}
    </div>
  );
  const blockedAlert = quality.status === "blocked" ? (
    <p className="rounded-lg bg-danger-background p-3 text-xs leading-5 text-danger">
      Click{" "}
      <button
        type="button"
        className="font-semibold underline decoration-danger/40 underline-offset-2 transition hover:text-red-800"
        onClick={() => setOpen(true)}
      >
        here
      </button>{" "}
      to resolve blocked readiness items before exporting or sending this report.
    </p>
  ) : null;
  const dialog = (
    <ReportReadinessDialog
      attentionItems={attentionItems}
      open={open}
      quality={quality}
      regenerateReportAction={regenerateReportAction}
      report={report}
      setOpen={setOpen}
    />
  );

  if (frame === "panel") {
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Report readiness</p>
            <p className="mt-1 text-sm text-muted-foreground">{getReadinessDescription(quality.status)}</p>
          </div>
          <Badge variant={getQualityBadgeVariant(quality.status)}>{quality.score}%</Badge>
        </div>
        <div className="mt-4">{checksContent}</div>
        {blockedAlert ? <div className="mt-3">{blockedAlert}</div> : null}
        {dialog}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Report readiness</h2>
        <p className="mt-1 text-sm text-muted-foreground">{getReadinessDescription(quality.status)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{quality.status}</p>
            <p className="mt-1 text-xs text-muted-foreground">Client-send score</p>
          </div>
          <Badge variant={getQualityBadgeVariant(quality.status)}>{quality.score}%</Badge>
        </div>
        {checksContent}
        {blockedAlert}
        {dialog}
      </CardContent>
    </Card>
  );
}

export function ReportReadinessStatusPill({
  quality,
  report,
  regenerateReportAction,
}: Omit<ReportReadinessCardProps, "frame">) {
  const [open, setOpen] = useState(false);

  if (quality.status === "ready") {
    return <Badge variant="success">Ready</Badge>;
  }

  const attentionItems = buildReportReadinessResolutionItems({
    quality,
    clientId: report.clientId,
  });

  return (
    <>
      <button
        type="button"
        className={getReadinessPillClassName(quality.status)}
        aria-label="Open report readiness fixes"
        onClick={() => setOpen(true)}
      >
        Not Ready
      </button>
      <ReportReadinessDialog
        attentionItems={attentionItems}
        open={open}
        quality={quality}
        regenerateReportAction={regenerateReportAction}
        report={report}
        setOpen={setOpen}
      />
    </>
  );
}

function ReportReadinessDialog({
  attentionItems,
  open,
  quality,
  regenerateReportAction,
  report,
  setOpen,
}: {
  attentionItems: ReportReadinessResolutionItem[];
  open: boolean;
  quality: ReportQuality;
  regenerateReportAction: (formData: FormData) => void | Promise<void>;
  report: Pick<ReportSummary, "clientId" | "clientName" | "period">;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
      <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto px-4 py-4 sm:py-8">
        <DialogPanel className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-950/10">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-950/10 px-6 py-5">
            <div>
              <p className="text-sm/6 font-medium text-zinc-500">Report readiness</p>
              <DialogTitle className="mt-1 text-xl/7 font-semibold text-zinc-950">
                Resolve blocked readiness items
              </DialogTitle>
              <p className="mt-2 max-w-xl text-sm/6 text-zinc-500">
                Work through the items for {report.clientName}, then regenerate the report so the readiness score refreshes.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close report readiness"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950"
              onClick={() => setOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
              <div>
                <p className="text-sm font-semibold text-zinc-950">{quality.score}% ready</p>
                <p className="mt-1 text-sm/6 text-zinc-500">{getReadinessDescription(quality.status)}</p>
              </div>
              <Badge variant={getQualityBadgeVariant(quality.status)}>{quality.status}</Badge>
            </div>

            <div className="mt-4 grid gap-3">
              {attentionItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-950/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                    <Badge variant={getCheckBadgeVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm/6 text-zinc-500">{item.detail}</p>
                  <p className="mt-2 text-sm/6 text-zinc-700">{item.guidance}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.actions.map((action) => (
                      <ResolutionActionButton key={`${item.id}-${action.label}`} action={action} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div id="regenerate-report" className="mt-5 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">Refresh this report</p>
                  <p className="mt-1 text-sm/6 text-zinc-500">
                    Regenerate after checks, issue updates, or narrative fixes so readiness can reach 100%.
                  </p>
                </div>
                <form action={regenerateReportAction}>
                  <input type="hidden" name="clientId" value={report.clientId} />
                  <input type="hidden" name="period" value={report.period} />
                  <FormSubmitButton type="submit" pendingLabel="Regenerating...">
                    <RefreshCw size={15} aria-hidden="true" />
                    Regenerate report
                  </FormSubmitButton>
                </form>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function ResolutionActionButton({
  action,
}: {
  action: ReportReadinessResolutionItem["actions"][number];
}) {
  if (action.type === "regenerate") {
    return (
      <a
        href="#regenerate-report"
        className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
      >
        <RefreshCw size={14} aria-hidden="true" />
        {action.label}
      </a>
    );
  }

  return (
    <Link
      href={action.href}
      className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
    >
      <ExternalLink size={14} aria-hidden="true" />
      {action.label}
    </Link>
  );
}

function getReadinessDescription(status: ReportQuality["status"]) {
  if (status === "ready") {
    return "Ready for client review and send.";
  }

  if (status === "review") {
    return "Review open risks before sending.";
  }

  return "Generate or improve source data before sending.";
}

function getQualityBadgeVariant(status: ReportQuality["status"]): "success" | "warning" | "danger" {
  return status === "ready" ? "success" : status === "review" ? "warning" : "danger";
}

function getCheckBadgeVariant(status: ReportReadinessResolutionItem["status"]): "success" | "warning" | "danger" {
  return status === "ready" ? "success" : status === "warning" ? "warning" : "danger";
}

function getReadinessPillClassName(status: ReportQuality["status"]) {
  const tone =
    status === "review"
      ? "border-amber-500/20 bg-amber-400/20 text-amber-700 hover:bg-amber-400/30"
      : "border-red-500/20 bg-red-400/20 text-red-700 hover:bg-red-400/30";

  return `inline-flex h-6 items-center rounded-md border px-2 text-xs/5 font-medium transition ${tone}`;
}
