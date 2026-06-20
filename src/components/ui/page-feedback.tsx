"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackItem = {
  id: "notice" | "error";
  message: string;
  tone: "success" | "danger";
};

export function PageFeedback({
  notice,
  error,
  variant = "toast",
}: {
  notice?: string;
  error?: string;
  variant?: "toast" | "inline";
}) {
  const items: FeedbackItem[] = [];

  if (notice) {
    items.push({ id: "notice", message: notice, tone: "success" });
  }

  if (error) {
    items.push({ id: "error", message: error, tone: "danger" });
  }

  if (!items.length) {
    return null;
  }

  if (variant === "inline") {
    return (
      <div className="grid gap-2">
        {items.map((item) => (
          <InlineFeedback key={`${item.id}-${item.message}`} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:right-6 sm:top-6">
      {items.map((item) => (
        <Toast key={`${item.id}-${item.message}`} item={item} />
      ))}
    </div>
  );
}

function InlineFeedback({ item }: { item: FeedbackItem }) {
  const Icon = item.tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div
      role={item.tone === "success" ? "status" : "alert"}
      aria-live={item.tone === "success" ? "polite" : "assertive"}
      aria-atomic="true"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-3 text-sm",
        item.tone === "success"
          ? "border-lime-500/25 bg-lime-50 text-lime-800"
          : "border-red-500/25 bg-red-50 text-red-800",
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="font-medium">{item.message}</span>
    </div>
  );
}

function Toast({ item }: { item: FeedbackItem }) {
  const Icon = item.tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div
      role={item.tone === "success" ? "status" : "alert"}
      aria-live={item.tone === "success" ? "polite" : "assertive"}
      aria-atomic="true"
      className={cn(
        "toast-notification pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 px-4 py-3 text-sm shadow-[0_18px_60px_rgb(24_24_27_/_18%),0_4px_14px_rgb(24_24_27_/_10%)] backdrop-blur",
        item.tone === "success" ? "border-lime-500/20 text-lime-800" : "border-red-500/20 text-red-800",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
          item.tone === "success" ? "bg-lime-100 text-lime-700" : "bg-red-100 text-red-700",
        )}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-zinc-500">Maintain Flow</span>
        <span className="mt-0.5 block text-sm/5 font-medium">{item.message}</span>
      </span>
    </div>
  );
}
