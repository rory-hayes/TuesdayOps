import { AppShell } from "@/components/app-shell";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { MarketingLandingPage } from "@/components/marketing/landing-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { user, workspace } = await getWorkspaceContext();

  if (!user) {
    return <MarketingLandingPage />;
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const [data, params] = await Promise.all([getOperationalData(workspace.agency), searchParams]);

  return (
    <AppShell
      workspace={workspace}
      clients={data.clients
        .filter((client) => !client.archived)
        .slice(0, 6)
        .map((client) => ({ id: client.id, name: client.name }))}
    >
      <OverviewDashboard
        data={data}
        error={readParam(params.error)}
      />
    </AppShell>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
