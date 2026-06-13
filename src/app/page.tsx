import { AppShell } from "@/components/app-shell";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspace = await requireWorkspace();
  const data = await getOperationalData(workspace.agency);

  return (
    <AppShell workspace={workspace}>
      <OverviewDashboard data={data} />
    </AppShell>
  );
}
