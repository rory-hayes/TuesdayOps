import { notFound } from "next/navigation";
import { ReportDetailPage } from "@/components/reports/report-detail-page";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";

type ReportDetailRouteProps = {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportDetailRoute({
  params,
  searchParams,
}: ReportDetailRouteProps) {
  const [workspace, routeParams, query] = await Promise.all([
    requireWorkspace(),
    params,
    searchParams,
  ]);
  const data = await getOperationalData(workspace.agency);
  const report = data.reports.find((candidate) => candidate.id === routeParams.reportId);

  if (!report) {
    notFound();
  }

  return (
    <ReportDetailPage
      data={data}
      report={report}
      notice={readParam(query.notice)}
      error={readParam(query.error)}
    />
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
