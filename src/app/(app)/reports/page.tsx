import { ReportsPage } from "@/components/reports/reports-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

type ReportsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsRoute({ searchParams }: ReportsRouteProps) {
  const [workspace, params] = await Promise.all([requireWorkspace(), searchParams]);
  const data = await getOperationalData(workspace.agency);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return <ReportsPage data={data} error={error} />;
}
