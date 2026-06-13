import { ReportsPage } from "@/components/reports/reports-page";
import { getOperationalData } from "@/lib/data/operational-data";
import { requireWorkspace } from "@/lib/auth/workspace";

export default async function ReportsRoute() {
  const workspace = await requireWorkspace();
  const data = await getOperationalData(workspace.agency);

  return <ReportsPage data={data} />;
}
