import Link from "next/link";
import { Archive, FileText, Save, Search } from "lucide-react";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { archiveClientAction, createClientAction, updateClientAction } from "@/lib/clients/service";
import { getOpenIssues } from "@/lib/domain/summaries";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatRelativeTime } from "@/lib/formatting";

export function ClientsPage({
  data,
  error,
  query,
}: {
  data: TuesdayOpsSeedData;
  error?: string;
  query?: string;
}) {
  const openIssues = getOpenIssues(data);
  const activeClients = data.clients.filter((client) => !client.archived);
  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const visibleClients = normalizedQuery
    ? data.clients.filter((client) =>
        [client.name, client.industry, client.reportRecipientEmail]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : data.clients;
  const averageHealth = activeClients.length
    ? Math.round(activeClients.reduce((total, client) => total + client.healthScore, 0) / activeClients.length)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        label="Clients"
        title="Client portfolio"
        description="Track each retained client's workflow health, issue load, and report readiness."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <PortfolioTile label="Average health" value={`${averageHealth}%`} detail="Across active clients" />
        <PortfolioTile label="Active clients" value={activeClients.length.toString()} detail="Tenant-scoped portfolio" />
        <PortfolioTile label="Open issues" value={openIssues.length.toString()} detail="Reportable queue" />
      </section>

      {error ? <p className="rounded-lg bg-danger-background p-3 text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Clients</h2>
            <p className="mt-1 text-sm text-muted-foreground">Portfolio health and reporting status.</p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search clients"
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-60"
              />
            </label>
            <Button variant="secondary" size="sm" type="submit">
              <Search size={15} aria-hidden="true" />
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Workflows</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Open issues</th>
                <th className="px-5 py-3 font-medium">Report</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.length ? visibleClients.map((client) => {
                const workflows = data.workflows.filter((workflow) => workflow.clientId === client.id);
                const clientIssues = openIssues.filter((issue) => issue.clientId === client.id);

                return (
                  <tr key={client.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <Link href={`/clients/${client.id}`} className="font-medium hover:text-zinc-700">
                        {client.name}
                      </Link>
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
                    <td className="px-5 py-4">
                      <details className="min-w-72">
                        <summary className="cursor-pointer text-sm font-medium text-primary">Edit</summary>
                        <form action={updateClientAction} className="mt-3 grid gap-2 rounded-lg bg-muted p-3">
                          <input type="hidden" name="id" value={client.id} />
                          <input type="hidden" name="slug" value={client.slug} />
                          <input
                            name="name"
                            defaultValue={client.name}
                            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                          <input
                            name="industry"
                            defaultValue={client.industry}
                            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                          <input
                            name="reportRecipientEmail"
                            type="email"
                            defaultValue={client.reportRecipientEmail}
                            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                          <input
                            name="notes"
                            defaultValue={client.notes}
                            className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm">
                              <Save size={14} aria-hidden="true" />
                              Save
                            </Button>
                          </div>
                        </form>
                        {!client.archived ? (
                          <form action={archiveClientAction} className="mt-2">
                            <input type="hidden" name="id" value={client.id} />
                            <Button type="submit" variant="secondary" size="sm">
                              <Archive size={14} aria-hidden="true" />
                              Archive
                            </Button>
                          </form>
                        ) : null}
                      </details>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={8}>
                    {data.clients.length
                      ? "No clients match this search."
                      : "Add your first client to start the workflow maintenance loop."}
                  </td>
                </tr>
              )}
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
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <FileText size={15} aria-hidden="true" />
            Export view
          </Button>
          <NewClientDialog action={createClientAction} />
        </div>
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
