import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  default: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/20 bg-success-background text-success",
  warning: "border-warning/20 bg-warning-background text-warning",
  danger: "border-danger/20 bg-danger-background text-danger",
  muted: "border-border bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
