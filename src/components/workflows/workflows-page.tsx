"use client";

import { useMemo, useState } from "react";
import { Activity, Play, Search } from "lucide-react";
import { BillingUpgradeDialog } from "@/components/billing/billing-upgrade-dialog";
import { StatusBadge } from "@/components/status-badge";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createCheckoutSessionAction, requestAgencyPlusContactAction } from "@/lib/billing/service";
import { getPlanLimitUpgradePrompt } from "@/lib/billing/upgrade";
import { runCheckAction } from "@/lib/checks/service";
import { createWorkflowAction, createWorkflowFromImportAction } from "@/lib/workflows/service";
import type { TuesdayOpsSeedData, Workflow } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

type WorkflowStatusFilter = "all" | Workflow["status"] | "attention";
type WorkflowSort = "name-asc" | "pass-rate-asc" | "pass-rate-desc" | "latency-asc" | "last-check-desc";

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
  const [searchTerm, setSearchTerm] = useState(query ?? "");
  const [clientFilter, setClientFilter] = useState(clientId ?? "");
  const [environmentFilter, setEnvironmentFilter] = useState(environment ?? "");
  const [statusFilter, setStatusFilter] = useState<WorkflowStatusFilter>(normalizeWorkflowStatusFilter(status));
  const [sortMode, setSortMode] = useState<WorkflowSort>("name-asc");
  const activeClients = useMemo(
    () => data.clients
      .filter((client) => !client.archived)
      .map((client) => ({ id: client.id, name: client.name })),
    [data.clients],
  );
  const visibleWorkflows = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const rows = data.workflows.filter((workflow) => {
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
      const matchesClient = clientFilter ? workflow.clientId === clientFilter : true;
      const matchesEnvironment = environmentFilter ? workflow.environment === environmentFilter : true;
      const matchesStatus = statusFilter === "all"
        ? true
        : statusFilter === "attention"
          ? workflow.status === "degraded" || workflow.status === "failed"
          : workflow.status === statusFilter;

      return matchesSearch && matchesClient && matchesEnvironment && matchesStatus;
    });

    return [...rows].sort((a, b) => compareWorkflows(a, b, sortMode));
  }, [clientFilter, data.clients, data.workflows, environmentFilter, searchTerm, sortMode, statusFilter]);
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

      <PageFeedback notice={notice} error={upgradePrompt ? undefined : error} variant="inline" />
      <BillingUpgradeDialog
        prompt={upgradePrompt}
        checkoutAction={createCheckoutSessionAction}
        agencyPlusContactAction={requestAgencyPlusContactAction}
        defaultContactName=""
        defaultContactEmail=""
      />

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
          <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_12rem_10rem_10rem_12rem]">
            <label className="relative block">
              <span className="sr-only">Search workflows</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Search workflows"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search workflows or endpoints"
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label>
              <span className="sr-only">Filter by client</span>
              <select
                aria-label="Filter by client"
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
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
                aria-label="Filter by environment"
                value={environmentFilter}
                onChange={(event) => setEnvironmentFilter(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">All envs</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Workflow status</span>
              <select
                aria-label="Workflow status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as WorkflowStatusFilter)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All health</option>
                <option value="attention">Needs attention</option>
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="failed">Failed</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort workflows</span>
              <select
                aria-label="Sort workflows"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as WorkflowSort)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="pass-rate-asc">Pass rate low-high</option>
                <option value="pass-rate-desc">Pass rate high-low</option>
                <option value="latency-asc">Latency low-high</option>
                <option value="last-check-desc">Last check</option>
              </select>
            </label>
          </div>
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
                        <span className="font-medium text-primary">
                          {workflow.name}
                        </span>
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

function normalizeWorkflowStatusFilter(value?: string): WorkflowStatusFilter {
  if (
    value === "healthy" ||
    value === "degraded" ||
    value === "failed" ||
    value === "unknown" ||
    value === "attention"
  ) {
    return value;
  }

  return "all";
}

function compareWorkflows(a: Workflow, b: Workflow, sortMode: WorkflowSort): number {
  if (sortMode === "pass-rate-asc") {
    return a.passRate - b.passRate || a.name.localeCompare(b.name);
  }

  if (sortMode === "pass-rate-desc") {
    return b.passRate - a.passRate || a.name.localeCompare(b.name);
  }

  if (sortMode === "latency-asc") {
    return a.latencyMs - b.latencyMs || a.name.localeCompare(b.name);
  }

  if (sortMode === "last-check-desc") {
    return toTime(b.lastCheckAt) - toTime(a.lastCheckAt) || a.name.localeCompare(b.name);
  }

  return a.name.localeCompare(b.name);
}

function toTime(value?: string): number {
  return value ? new Date(value).getTime() : 0;
}
