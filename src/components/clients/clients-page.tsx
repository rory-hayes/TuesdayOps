import { BriefcaseBusiness, FileText, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { seedData } from "@/lib/data/seed";
import { getOpenIssues } from "@/lib/domain/summaries";
import { formatRelativeTime } from "@/lib/formatting";

export function ClientsPage() {
  const openIssues = getOpenIssues(seedData);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        label="Clients"
        title="Client portfolio"
        description="Track each retained client's workflow health, issue load, and report readiness."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <PortfolioTile label="Average health" value="89%" detail="Across active clients" />
        <PortfolioTile label="Reports this cycle" value="4" detail="2 ready, 2 drafts" />
        <PortfolioTile label="Open issues" value={openIssues.length.toString()} detail="Reportable queue" />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Clients</h2>
            <p className="mt-1 text-sm text-muted-foreground">Portfolio health and reporting status.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Search size={15} aria-hidden="true" />
              Filter
            </Button>
            <Button size="sm">
              <BriefcaseBusiness size={15} aria-hidden="true" />
              Add client
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Workflows</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Open issues</th>
                <th className="px-5 py-3 font-medium">Report</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {seedData.clients.map((client) => {
                const workflows = seedData.workflows.filter((workflow) => workflow.clientId === client.id);
                const clientIssues = openIssues.filter((issue) => issue.clientId === client.id);

                return (
                  <tr key={client.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-medium">{client.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{client.industry}</p>
                    </td>
                    <td className="px-5 py-4">{workflows.length}</td>
                    <td className="px-5 py-4">{client.healthScore}%</td>
                    <td className="px-5 py-4">{clientIssues.length}</td>
                    <td className="px-5 py-4">
                      {client.reportStatus === "ready" ? (
                        <StatusBadge status="ready_to_send" />
                      ) : client.reportStatus === "not_started" ? (
                        <Badge variant="muted">not started</Badge>
                      ) : (
                        <StatusBadge status={client.reportStatus} />
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{client.owner}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {formatRelativeTime(client.lastActivityAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-medium text-primary">{label}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Button variant="secondary" size="sm">
        <FileText size={15} aria-hidden="true" />
        Export view
      </Button>
    </section>
  );
}

function PortfolioTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="shadow-none">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-3 text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
