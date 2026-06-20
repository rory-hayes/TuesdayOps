"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BillingUpgradeDialog } from "@/components/billing/billing-upgrade-dialog";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createCheckoutSessionAction } from "@/lib/billing/service";
import { getPlanLimitUpgradePrompt } from "@/lib/billing/upgrade";
import { archiveClientAction, createClientAction, updateClientAction } from "@/lib/clients/service";
import { getOpenIssues } from "@/lib/domain/summaries";
import type { Client, TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatRelativeTime } from "@/lib/formatting";

type ClientStatusFilter = "all" | "active" | "archived";
type ClientSort = "name-asc" | "health-desc" | "health-asc" | "issues-desc" | "activity-desc";

export function ClientsPage({
  data,
  notice,
  error,
  query,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
  query?: string;
}) {
  const [searchTerm, setSearchTerm] = useState(query ?? "");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [sortMode, setSortMode] = useState<ClientSort>("name-asc");
  const openIssues = useMemo(() => getOpenIssues(data), [data]);
  const activeClients = useMemo(
    () => data.clients.filter((client) => !client.archived),
    [data.clients],
  );
  const issueCountsByClient = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of openIssues) {
      counts.set(issue.clientId, (counts.get(issue.clientId) ?? 0) + 1);
    }
    return counts;
  }, [openIssues]);
  const workflowsByClient = useMemo(() => {
    const counts = new Map<string, number>();
    for (const workflow of data.workflows) {
      counts.set(workflow.clientId, (counts.get(workflow.clientId) ?? 0) + 1);
    }
    return counts;
  }, [data.workflows]);
  const visibleClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = data.clients.filter((client) => {
      if (statusFilter === "active" && client.archived) {
        return false;
      }

      if (statusFilter === "archived" && !client.archived) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        client.name,
        client.industry,
        client.owner,
        client.reportRecipientEmail,
        client.reportStatus.replaceAll("_", " "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

    return [...rows].sort((a, b) => compareClients(a, b, sortMode, issueCountsByClient));
  }, [data.clients, issueCountsByClient, searchTerm, sortMode, statusFilter]);
  const averageHealth = activeClients.length
    ? Math.round(activeClients.reduce((total, client) => total + client.healthScore, 0) / activeClients.length)
    : 0;
  const upgradePrompt = getPlanLimitUpgradePrompt({
    error,
    plan: data.agency.plan,
    billingStatus: data.agency.billingStatus,
    activeClients: activeClients.length,
    workflows: data.workflows.length,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        label="Clients"
        title="Client portfolio"
        description="Track each retained client's workflow health, issue load, and report readiness."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <PortfolioTile label="Average health" value={`${averageHealth}%`} detail="Across active clients" />
        <PortfolioTile label="Active clients" value={activeClients.length.toString()} detail="Non-archived client accounts" />
        <PortfolioTile label="Open issues" value={openIssues.length.toString()} detail="Reportable maintenance issues" />
      </section>

      <PageFeedback notice={notice} error={upgradePrompt ? undefined : error} />
      <BillingUpgradeDialog prompt={upgradePrompt} checkoutAction={createCheckoutSessionAction} />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Clients</h2>
            <p className="mt-1 text-sm text-muted-foreground">Portfolio health and reporting status.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_10rem_12rem]">
            <label className="relative block">
              <span className="sr-only">Search clients</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Search clients"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search clients"
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-60"
              />
            </label>
            <label className="block">
              <span className="sr-only">Client status</span>
              <select
                aria-label="Client status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ClientStatusFilter)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All clients</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Sort clients</span>
              <select
                aria-label="Sort clients"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as ClientSort)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="health-desc">Health high-low</option>
                <option value="health-asc">Health low-high</option>
                <option value="issues-desc">Open issues high-low</option>
                <option value="activity-desc">Last activity</option>
              </select>
            </label>
          </div>
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
                const workflowCount = workflowsByClient.get(client.id) ?? 0;
                const clientIssueCount = issueCountsByClient.get(client.id) ?? 0;

                return (
                  <ClickableTableRow
                    key={client.id}
                    href={`/clients/${client.id}`}
                    label={`Open client ${client.name}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                          {client.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/clients/${client.id}`} className="font-medium hover:text-zinc-700">
                            {client.name}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">{client.industry}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{workflowCount}</td>
                    <td className="px-5 py-4">{client.healthScore}%</td>
                    <td className="px-5 py-4">{clientIssueCount}</td>
                    <td className="px-5 py-4">
                      <div className="grid gap-1">
                        <span>
                          {client.reportStatus === "ready" ? (
                            <StatusBadge status="ready_to_send" />
                          ) : client.reportStatus === "not_started" ? (
                            <Badge variant="muted">not started</Badge>
                          ) : (
                            <StatusBadge status={client.reportStatus} />
                          )}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground">
                          Last: {formatReportDate(client.lastReportGeneratedAt)}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground">
                          Next due: {formatReportDate(client.nextReportDueOn)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{client.owner}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {formatRelativeTime(client.lastActivityAt)}
                    </td>
                    <td className="px-5 py-4">
                      <EditClientDialog
                        client={client}
                        updateAction={updateClientAction}
                        archiveAction={archiveClientAction}
                      />
                    </td>
                  </ClickableTableRow>
                );
              }) : (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={8}>
                    {data.clients.length
                      ? "No clients match the current search or filters."
                      : "No clients yet - add one to get started."}
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

function compareClients(
  a: Client,
  b: Client,
  sortMode: ClientSort,
  issueCountsByClient: Map<string, number>,
): number {
  const nameComparison = a.name.localeCompare(b.name);

  if (sortMode === "health-desc") {
    return b.healthScore - a.healthScore || nameComparison;
  }

  if (sortMode === "health-asc") {
    return a.healthScore - b.healthScore || nameComparison;
  }

  if (sortMode === "issues-desc") {
    return (issueCountsByClient.get(b.id) ?? 0) - (issueCountsByClient.get(a.id) ?? 0) || nameComparison;
  }

  if (sortMode === "activity-desc") {
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime() || nameComparison;
  }

  return nameComparison;
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

function formatReportDate(value?: string): string {
  if (!value) {
    return "Not generated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
