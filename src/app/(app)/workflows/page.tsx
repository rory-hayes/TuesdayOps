import { WorkflowsPage } from "@/components/workflows/workflows-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

type WorkflowsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkflowsRoute({ searchParams }: WorkflowsRouteProps) {
  const [workspace, params] = await Promise.all([requireWorkspace(), searchParams]);
  const data = await getOperationalData(workspace.agency);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const environment = Array.isArray(params.environment) ? params.environment[0] : params.environment;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;

  return (
    <WorkflowsPage
      data={data}
      notice={notice}
      error={error}
      query={query}
      clientId={clientId}
      environment={environment}
      status={status}
    />
  );
}
