import { ClientsPage } from "@/components/clients/clients-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

type ClientsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsRoute({ searchParams }: ClientsRouteProps) {
  const [workspace, params] = await Promise.all([requireWorkspace(), searchParams]);
  const data = await getOperationalData(workspace.agency);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;

  return <ClientsPage data={data} notice={notice} error={error} query={query} />;
}
