import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-[#5546ad] data-[active]:bg-[#5546ad]",
  secondary:
    "border-zinc-950/10 bg-white text-zinc-950 shadow-sm hover:bg-zinc-50 data-[active]:bg-zinc-50",
  ghost: "border-transparent bg-transparent text-zinc-600 hover:bg-zinc-950/5 hover:text-zinc-950",
  danger:
    "border-transparent bg-red-600 text-white shadow-sm hover:bg-red-500",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm/6",
  md: "h-9 px-3.5 text-sm/6",
  lg: "h-10 px-4 text-sm/6",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative isolate inline-flex items-center justify-center gap-x-2 whitespace-nowrap rounded-lg border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 [&>svg]:-mx-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
