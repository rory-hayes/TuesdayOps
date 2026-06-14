import { IssuesPage } from "@/components/issues/issues-page";
import type { IssueFilters } from "@/components/issues/issues-page";
import { getOperationalData } from "@/lib/data/operational-data";
import type { IssueSeverity, IssueStatus } from "@/lib/domain/types";
import { requireWorkspace } from "@/lib/auth/workspace";

const issueStatuses = new Set<IssueStatus>(["open", "in_review", "resolved", "ignored"]);
const issueSeverities = new Set<IssueSeverity>(["critical", "high", "medium", "low"]);

export default async function IssuesRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspace = await requireWorkspace();
  const data = await getOperationalData(workspace.agency);
  const params = await searchParams;
  const filters = parseFilters(params);

  return <IssuesPage data={data} filters={filters} />;
}

function parseFilters(params: Record<string, string | string[] | undefined>): IssueFilters {
  const status = firstParam(params.status);
  const severity = firstParam(params.severity);

  return {
    status: status && issueStatuses.has(status as IssueStatus) ? (status as IssueStatus) : "all",
    severity:
      severity && issueSeverities.has(severity as IssueSeverity)
        ? (severity as IssueSeverity)
        : "all",
    clientId: firstParam(params.clientId),
    workflowId: firstParam(params.workflowId),
    error: firstParam(params.error),
    notice: firstParam(params.notice),
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
