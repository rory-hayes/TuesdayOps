import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-sm/6 font-semibold text-zinc-950", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-zinc-950 text-white">
        <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
          <path
            d="M4.5 14.25c3.25 0 3.25-4.5 6.5-4.5s3.25 4.5 6.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <circle cx="4.5" cy="14.25" r="2.1" fill="currentColor" />
          <circle cx="11" cy="9.75" r="2.1" fill="currentColor" />
          <circle cx="17.5" cy="14.25" r="2.1" fill="currentColor" />
        </svg>
      </span>
      Maintain Flow
    </span>
  );
}
