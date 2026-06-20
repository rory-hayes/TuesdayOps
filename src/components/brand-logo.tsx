import { BoltIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm/6 font-semibold text-zinc-950", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-zinc-950 text-white">
        <BoltIcon className="size-4" aria-hidden="true" />
      </span>
      Tuesday
    </span>
  );
}
