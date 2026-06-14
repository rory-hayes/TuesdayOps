import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  default: "border-zinc-950/10 bg-zinc-950/5 text-zinc-700",
  success: "border-lime-500/20 bg-lime-400/20 text-lime-700",
  warning: "border-amber-500/20 bg-amber-400/20 text-amber-700",
  danger: "border-red-500/20 bg-red-400/20 text-red-700",
  muted: "border-zinc-950/10 bg-zinc-950/5 text-zinc-500",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs/5 font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
