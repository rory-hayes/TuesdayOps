import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const workspace = await requireWorkspace();

  return <AppShell workspace={workspace}>{children}</AppShell>;
}
