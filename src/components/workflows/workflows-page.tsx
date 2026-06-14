import Link from "next/link";
import { Activity } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createWorkflowAction, createWorkflowFromImportAction } from "@/lib/workflows/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatCurrency, formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function WorkflowsPage({
  data,
  error,
}: {
  data: TuesdayOpsSeedData;
  error?: string;
}) {
  const activeClients = data.clients
    .filter((client) => !client.archived)
    .map((client) => ({ id: client.id, name: client.name }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Workflows</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            Monitored AI workflows
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Registry of client automations, agents, endpoints, and MCP services under maintenance.
          </p>
        </div>
        <AddWorkflowDialog
          clients={activeClients}
          createWorkflowAction={createWorkflowAction}
          createWorkflowFromImportAction={createWorkflowFromImportAction}
        />
      </section>

      {error ? <p className="rounded-lg bg-danger-background p-3 text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Workflow registry</h2>
            <p className="mt-1 text-sm text-muted-foreground">Production checks and report inclusion.</p>
          </div>
          <Activity size={18} className="text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className={data.workflows.length ? "overflow-x-auto p-0" : ""}>
          {data.workflows.length ? (
            <table className="w-full min-w-[940px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Workflow</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Pass rate</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                  <th className="px-5 py-3 font-medium">Last check</th>
                  <th className="px-5 py-3 font-medium">Report</th>
                </tr>
              </thead>
              <tbody>
                {data.workflows.map((workflow) => {
                  const client = data.clients.find((candidate) => candidate.id === workflow.clientId);

                  return (
                    <tr key={workflow.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-4">
                        <Link href={`/workflows/${workflow.id}`} className="font-medium text-primary">
                          {workflow.name}
                        </Link>
                        <p className="mt-1 max-w-64 truncate text-xs text-muted-foreground">
                          {workflow.endpointUrl}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{client?.name}</td>
                      <td className="px-5 py-4">
                        <Badge variant="muted">{workflow.type.replaceAll("_", " ")}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-5 py-4">{formatPercentage(workflow.passRate)}</td>
                      <td className="px-5 py-4">{workflow.latencyMs} ms</td>
                      <td className="px-5 py-4">{formatCurrency(workflow.monthlyCost)}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatRelativeTime(workflow.lastCheckAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={workflow.includedInReports ? "success" : "muted"}>
                          {workflow.includedInReports ? "included" : "excluded"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Use Add workflow to import or manually register your first monitored endpoint.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
