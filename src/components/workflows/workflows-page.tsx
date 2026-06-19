"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Play, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createCheckoutSessionAction } from "@/lib/billing/service";
import { runCheckAction } from "@/lib/checks/service";
import { createWorkflowAction, createWorkflowFromImportAction } from "@/lib/workflows/service";
import type { TuesdayOpsSeedData, Workflow } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

type WorkflowStatusFilter = "all" | "attention" | Workflow["status"];
type WorkflowSort = "name-asc" | "pass-rate-asc" | "pass-rate-desc" | "latency-desc" | "last-check-desc";

export function WorkflowsPage({
  data,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkflowStatusFilter>("all");
  const [sortMode, setSortMode] = useState<WorkflowSort>("name-asc");
  const activeClients = data.clients
    .filter((client) => !client.archived)
    .map((client) => ({ id: client.id, name: client.name }));
  const clientsById = useMemo(
    () => new Map(data.clients.map((client) => [client.id, client.name])),
    [data.clients],
  );
  const visibleWorkflows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = data.workflows.filter((workflow) => {
      const clientName = clientsById.get(workflow.clientId) ?? "";

      if (statusFilter === "attention" && workflow.status !== "failed" && workflow.status !== "degraded") {
        return false;
      }

      if (statusFilter !== "all" && statusFilter !== "attention" && workflow.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        workflow.name,
        clientName,
        workflow.endpointUrl,
        workflow.type.replaceAll("_", " "),
        workflow.environment,
        workflow.method,
        workflow.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

    return [...rows].sort((a, b) => compareWorkflows(a, b, sortMode));
  }, [clientsById, data.workflows, searchTerm, sortMode, statusFilter]);

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

      <PageFeedback notice={notice} error={error} />
      {error?.toLowerCase().includes("upgrade") ? (
        <form action={createCheckoutSessionAction} className="-mt-3">
          <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Opening billing...">
            Click here to upgrade
          </FormSubmitButton>
        </form>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Workflow registry</h2>
            <p className="mt-1 text-sm text-muted-foreground">Production checks and report inclusion.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_11rem_12rem]">
            <label className="relative block">
              <span className="sr-only">Search workflows</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Search workflows"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search workflows"
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="sr-only">Workflow status</span>
              <select
                aria-label="Workflow status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as WorkflowStatusFilter)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All statuses</option>
                <option value="attention">Needs attention</option>
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="failed">Failed</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label className="block">
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
                <option value="latency-desc">Latency high-low</option>
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
                  const clientName = clientsById.get(workflow.clientId);
                  const primaryCheck = data.checks.find((check) => check.workflowId === workflow.id && check.enabled);

                  return (
                    <tr key={workflow.id} className="border-b border-border last:border-0">
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
                      <td className="px-5 py-4 text-muted-foreground">{clientName}</td>
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
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={11}>
                      No workflows match the current search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No workflows yet - add one to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function compareWorkflows(a: Workflow, b: Workflow, sortMode: WorkflowSort): number {
  const nameComparison = a.name.localeCompare(b.name);

  if (sortMode === "pass-rate-asc") {
    return a.passRate - b.passRate || nameComparison;
  }

  if (sortMode === "pass-rate-desc") {
    return b.passRate - a.passRate || nameComparison;
  }

  if (sortMode === "latency-desc") {
    return b.latencyMs - a.latencyMs || nameComparison;
  }

  if (sortMode === "last-check-desc") {
    return getWorkflowLastCheckTime(b) - getWorkflowLastCheckTime(a) || nameComparison;
  }

  return nameComparison;
}

function getWorkflowLastCheckTime(workflow: Workflow): number {
  return workflow.lastCheckAt ? new Date(workflow.lastCheckAt).getTime() : 0;
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
