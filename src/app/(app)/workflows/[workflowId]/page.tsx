import { notFound } from "next/navigation";
import { WorkflowDetailPage } from "@/components/workflows/workflow-detail-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

type WorkflowDetailRouteProps = {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkflowDetailRoute({
  params,
  searchParams,
}: WorkflowDetailRouteProps) {
  const [workspace, routeParams, query] = await Promise.all([
    requireWorkspace(),
    params,
    searchParams,
  ]);
  const data = await getOperationalData(workspace.agency);
  const workflow = data.workflows.find((candidate) => candidate.id === routeParams.workflowId);
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  if (!workflow) {
    notFound();
  }

  return <WorkflowDetailPage data={data} workflow={workflow} error={error} />;
}
