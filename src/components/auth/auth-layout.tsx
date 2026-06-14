import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export function AuthLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 py-12 text-zinc-950 lg:bg-zinc-100">
      <section
        className={cn(
          "grid w-full max-w-sm grid-cols-1 gap-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/10 lg:p-10",
          className,
        )}
      >
        <BrandLogo />
        {children}
      </section>
    </main>
  );
}
