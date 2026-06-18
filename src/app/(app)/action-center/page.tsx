import { ActionCenterPage, getActionCenterTab } from "@/components/action-center/action-center-page";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";

type ActionCenterRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ActionCenterRoute({ searchParams }: ActionCenterRouteProps) {
  const [workspace, params] = await Promise.all([requireWorkspace(), searchParams]);
  const data = await getOperationalData(workspace.agency);
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;

  return <ActionCenterPage data={data} activeTab={getActionCenterTab(tab)} notice={notice} error={error} />;
}
