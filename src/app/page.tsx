import { AppShell } from "@/components/app-shell";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";

export default function Home() {
  return (
    <AppShell>
      <OverviewDashboard />
    </AppShell>
  );
}
