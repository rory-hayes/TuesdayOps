import Link from "next/link";
import { Activity, Play, Search } from "lucide-react";
import { BillingUpgradeDialog } from "@/components/billing/billing-upgrade-dialog";
import { StatusBadge } from "@/components/status-badge";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createCheckoutSessionAction } from "@/lib/billing/service";
import { getPlanLimitUpgradePrompt } from "@/lib/billing/upgrade";
import { runCheckAction } from "@/lib/checks/service";
import { createWorkflowAction, createWorkflowFromImportAction } from "@/lib/workflows/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function WorkflowsPage({
  data,
  notice,
  error,
  query,
  clientId,
  environment,
  status,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
  query?: string;
  clientId?: string;
  environment?: string;
  status?: string;
}) {
  const activeClients = data.clients
    .filter((client) => !client.archived)
    .map((client) => ({ id: client.id, name: client.name }));
  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const visibleWorkflows = data.workflows.filter((workflow) => {
    const client = data.clients.find((candidate) => candidate.id === workflow.clientId);
    const matchesSearch = normalizedQuery
      ? [
          workflow.name,
          workflow.endpointUrl,
          workflow.type,
          workflow.environment,
          client?.name ?? "",
        ].join(" ").toLowerCase().includes(normalizedQuery)
      : true;
    const matchesClient = clientId ? workflow.clientId === clientId : true;
    const matchesEnvironment = environment ? workflow.environment === environment : true;
    const matchesStatus = status ? workflow.status === status : true;

    return matchesSearch && matchesClient && matchesEnvironment && matchesStatus;
  });
  const upgradePrompt = getPlanLimitUpgradePrompt({
    error,
    plan: data.agency.plan,
    billingStatus: data.agency.billingStatus,
    activeClients: activeClients.length,
    workflows: data.workflows.length,
  });

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

      <PageFeedback notice={notice} error={upgradePrompt ? undefined : error} />
      <BillingUpgradeDialog prompt={upgradePrompt} checkoutAction={createCheckoutSessionAction} />

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Workflow registry</h2>
              <Activity size={18} className="text-primary" aria-hidden="true" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Production checks and report inclusion. Showing {visibleWorkflows.length} of {data.workflows.length}.
            </p>
          </div>
          <form className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_12rem_10rem_10rem_auto]">
            <label className="relative block">
              <span className="sr-only">Search workflows</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true" />
              <input
                name="q"
                aria-label="Search workflows"
                defaultValue={query}
                placeholder="Search workflows or endpoints"
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label>
              <span className="sr-only">Filter by client</span>
              <select
                name="clientId"
                aria-label="Filter by client"
                defaultValue={clientId ?? ""}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">All clients</option>
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by environment</span>
              <select
                name="environment"
                aria-label="Filter by environment"
                defaultValue={environment ?? ""}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">All envs</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                name="status"
                aria-label="Filter by status"
                defaultValue={status ?? ""}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">All health</option>
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="failed">Failed</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <Button variant="secondary" size="sm" type="submit">
              <Search size={15} aria-hidden="true" />
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent className={data.workflows.length ? "overflow-x-auto p-0" : ""}>
          {data.workflows.length ? (
            <table className="w-full min-w-[1220px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Workflow</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Environment</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last check</th>
                  <th className="px-5 py-3 font-medium">Pass rate</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">Frequency</th>
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleWorkflows.length ? visibleWorkflows.map((workflow) => {
                  const client = data.clients.find((candidate) => candidate.id === workflow.clientId);
                  const primaryCheck = data.checks.find((check) => check.workflowId === workflow.id && check.enabled);

                  return (
                    <ClickableTableRow
                      key={workflow.id}
                      href={`/workflows/${workflow.id}`}
                      label={`Open workflow ${workflow.name}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="max-w-[34rem] px-5 py-4">
                        <Link href={`/workflows/${workflow.id}`} className="font-medium text-primary">
                          {workflow.name}
                        </Link>
                        <div className="mt-2 flex items-start gap-2">
                          <Badge variant="muted">{workflow.method}</Badge>
                          <p className="min-w-0 break-all font-mono text-xs leading-5 text-muted-foreground">
                            {workflow.endpointUrl}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{client?.name}</td>
                      <td className="px-5 py-4">
                        <Badge variant="muted">{workflow.type.replaceAll("_", " ")}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="muted">{workflow.environment}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatWorkflowLastCheck(workflow.lastCheckAt)}
                      </td>
                      <td className="px-5 py-4">{formatPercentage(workflow.passRate)}</td>
                      <td className="px-5 py-4">{workflow.latencyMs} ms</td>
                      <td className="px-5 py-4">{formatFrequency(workflow.checkFrequencyMinutes)}</td>
                      <td className="px-5 py-4">
                        <Badge variant={workflow.includedInReports ? "success" : "muted"}>
                          {workflow.includedInReports ? "included" : "excluded"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {primaryCheck ? (
                            <form action={runCheckAction}>
                              <input type="hidden" name="checkId" value={primaryCheck.id} />
                              <FormSubmitButton type="submit" size="sm" pendingLabel="Running...">
                                <Play size={14} aria-hidden="true" />
                                Run
                              </FormSubmitButton>
                            </form>
                          ) : null}
                          <Link
                            href={`/workflows/${workflow.id}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </ClickableTableRow>
                  );
                }) : (
                  <tr>
                    <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={11}>
                      No workflows match these filters.
                    </td>
                  </tr>
                )}
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

function formatWorkflowLastCheck(value?: string): string {
  return value ? formatRelativeTime(value) : "Not run yet";
}

function formatFrequency(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes % 1440 === 0) {
    return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hr${minutes === 60 ? "" : "s"}`;
  }

  return `${minutes} min`;
}
