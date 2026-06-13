import { ChecksPage } from "@/components/checks/checks-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

type ChecksRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChecksRoute({ searchParams }: ChecksRouteProps) {
  const [workspace, params] = await Promise.all([requireWorkspace(), searchParams]);
  const data = await getOperationalData(workspace.agency);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return <ChecksPage data={data} error={error} />;
}
