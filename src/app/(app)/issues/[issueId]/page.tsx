import { notFound } from "next/navigation";
import { IssueDetailPage } from "@/components/issues/issue-detail-page";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";

type IssueDetailRouteProps = {
  params: Promise<{ issueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IssueDetailRoute({
  params,
  searchParams,
}: IssueDetailRouteProps) {
  const [workspace, routeParams, query] = await Promise.all([
    requireWorkspace(),
    params,
    searchParams,
  ]);
  const data = await getOperationalData(workspace.agency);
  const issue = data.issues.find((candidate) => candidate.id === routeParams.issueId);

  if (!issue) {
    notFound();
  }

  return (
    <IssueDetailPage
      data={data}
      issue={issue}
      notice={readParam(query.notice)}
      error={readParam(query.error)}
    />
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
