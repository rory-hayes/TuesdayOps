import { AppShell } from "@/components/app-shell";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const workspace = await requireWorkspace();
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
        notice={readSampleNotice(readParam(params.sample))}
        error={readParam(params.error)}
      />
    </AppShell>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readSampleNotice(value: string | undefined): string | undefined {
  if (value === "seeded") {
    return "Demo data is ready.";
  }

  if (value === "already") {
    return "Demo data was already seeded.";
  }

  return undefined;
}
