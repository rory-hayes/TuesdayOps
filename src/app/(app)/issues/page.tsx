import { IssuesPage } from "@/components/issues/issues-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

export default async function IssuesRoute() {
  const workspace = await requireWorkspace();
  const data = await getOperationalData(workspace.agency);

  return <IssuesPage data={data} />;
}
