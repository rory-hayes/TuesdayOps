import { notFound } from "next/navigation";
import { ClientDetailPage } from "@/components/clients/client-detail-page";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";

type ClientDetailRouteProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientDetailRoute({ params }: ClientDetailRouteProps) {
  const [{ clientId }, workspace] = await Promise.all([params, requireWorkspace()]);
  const data = await getOperationalData(workspace.agency);
  const client = data.clients.find((candidate) => candidate.id === clientId);

  if (!client) {
    notFound();
  }

  return <ClientDetailPage data={data} client={client} />;
}
