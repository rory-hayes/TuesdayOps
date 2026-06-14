import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("agency_id", workspace.agency.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    throw new Error(`Unable to load sidebar clients: ${error.message}`);
  }

  return (
    <AppShell
      workspace={workspace}
      clients={(clients ?? []).map((client) => ({ id: client.id, name: client.name }))}
    >
      {children}
    </AppShell>
  );
}
