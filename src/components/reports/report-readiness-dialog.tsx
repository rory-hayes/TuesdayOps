"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportQuality } from "@/lib/reports/quality";
import { cn } from "@/lib/utils";

export function ReportReadinessDialog({
  clientId,
  quality,
}: {
  clientId?: string;
  quality: ReportQuality;
}) {
  const [open, setOpen] = useState(false);
  const ready = quality.status === "ready";
  const variant = ready ? "success" : quality.status === "review" ? "warning" : "danger";
  const label = ready ? "Ready" : "Not ready";
  const detailLabel = quality.status === "review" ? "Review details" : "View details";

  if (ready) {
    return (
      <Badge variant="success" aria-label="Report readiness: Ready">
        Ready
      </Badge>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Report readiness: ${label}. ${detailLabel}`}
        className={cn(
          "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs/5 font-medium transition hover:shadow-sm focus:outline-none focus:ring-2",
          variant === "warning"
            ? "border-amber-500/20 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-500/20"
            : "border-red-500/20 bg-danger-background text-danger hover:bg-red-100 focus:ring-red-500/20",
        )}
        onClick={() => setOpen(true)}
      >
        <AlertCircle size={13} strokeWidth={2.2} aria-hidden="true" />
        <span>{label}</span>
        <span className="text-current/75">{detailLabel}</span>
        <ChevronRight size={13} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {open ? (
        <div
          aria-modal="true"
          role="dialog"
          aria-labelledby="report-readiness-title"
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/35 p-4"
        >
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-danger-background text-danger">
                <AlertCircle size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 id="report-readiness-title" className="text-base font-semibold">
                  Resolve report readiness
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  This report is {quality.score}% ready. Clear the blocked items before exporting or sending it.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {quality.checks.map((check) => (
                <div key={check.id} className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{check.label}</p>
                    <Badge variant={check.status === "ready" ? "success" : check.status === "warning" ? "warning" : "danger"}>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{check.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
              {clientId ? (
                <Link
                  href={`/clients/${clientId}`}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm transition hover:bg-muted"
                >
                  Client workspace
                </Link>
              ) : null}
              <Link
                href="/action-center"
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-zinc-800"
              >
                Action center
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
