"use client";

import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileText, Inbox, ListChecks, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Check, CheckRun, Client, Issue, Workflow } from "@/lib/domain/types";
import { formatRelativeTime } from "@/lib/formatting";
import type { OperationalReliability } from "@/lib/production/operational-reliability";
import { cn } from "@/lib/utils";

type ActionCenterTab = "issues" | "runs" | "checks" | "readiness" | "proof";

type OverviewActionCenterProps = {
  openIssues: Issue[];
  recentRuns: CheckRun[];
  scheduledChecks: Check[];
  workflows: Workflow[];
  clients: Client[];
  reportsDue: number;
  reliability: OperationalReliability;
};

const tabCopy: Record<ActionCenterTab, { label: string; detail: string }> = {
  issues: {
    label: "Issues",
    detail: "Failures and degraded checks that need a maintenance decision.",
  },
  runs: {
    label: "Runs",
    detail: "Latest stored endpoint results across monitored workflows.",
  },
  checks: {
    label: "Checks",
    detail: "Enabled checks due in the current cycle.",
  },
  readiness: {
    label: "Readiness",
    detail: "Signals to review before a client maintenance report.",
  },
  proof: {
    label: "Proof",
    detail: "Report evidence and tenant-scoped source data.",
  },
};

export function OverviewActionCenter({
  openIssues,
  recentRuns,
  scheduledChecks,
  workflows,
  clients,
  reportsDue,
  reliability,
}: OverviewActionCenterProps) {
  const [activeTab, setActiveTab] = useState<ActionCenterTab>(openIssues.length ? "issues" : "runs");
  const tablistId = useId();
  const tabs = useMemo(
    () => [
      {
        id: "issues" as const,
        icon: Inbox,
        count: openIssues.length,
        tone: openIssues.length ? "danger" : "muted",
      },
      {
        id: "runs" as const,
        icon: Activity,
        count: recentRuns.length,
        tone: recentRuns.some((run) => run.status === "failed") ? "danger" : "muted",
      },
      {
        id: "checks" as const,
        icon: ListChecks,
        count: scheduledChecks.length,
        tone: scheduledChecks.some((check) => check.latestStatus === "failed") ? "danger" : "muted",
      },
      {
        id: "readiness" as const,
        icon: ShieldCheck,
        count: reliability.checks.filter((check) => check.status === "attention").length,
        tone: reliability.ready ? "success" : "warning",
      },
      {
        id: "proof" as const,
        icon: FileText,
        count: reportsDue,
        tone: reportsDue ? "warning" : "muted",
      },
    ],
    [openIssues.length, recentRuns, reliability, reportsDue, scheduledChecks],
  );
  const activeCopy = tabCopy[activeTab];

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-4 py-4">
        <div>
          <h2 className="text-base/7 font-semibold text-zinc-950">Action center</h2>
          <p className="mt-1 text-sm/6 text-zinc-500">{activeCopy.detail}</p>
        </div>
        <Badge variant={reliability.ready ? "success" : "warning"}>
          {reliability.ready ? "ready" : "review"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid min-h-[390px] lg:grid-cols-[9.5rem_minmax(0,1fr)]">
          <div
            id={tablistId}
            role="tablist"
            aria-label="Overview action center"
            className="flex gap-1 overflow-x-auto border-b border-zinc-950/10 bg-zinc-50/70 p-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r"
          >
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  id={`${tablistId}-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`${tablistId}-${tab.id}-panel`}
                  aria-label={`${tabCopy[tab.id].label}, ${tab.count} ${tab.count === 1 ? "item" : "items"}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-w-32 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary/25 lg:min-w-0",
                    active
                      ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/10"
                      : "text-zinc-500 hover:bg-white/70 hover:text-zinc-950",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon size={15} aria-hidden="true" className={active ? "text-primary" : "text-zinc-400"} />
                    <span className="truncate">{tabCopy[tab.id].label}</span>
                  </span>
                  <TabCount count={tab.count} tone={tab.tone} />
                </button>
              );
            })}
          </div>

          <section
            id={`${tablistId}-${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${tablistId}-${activeTab}`}
            className="min-w-0 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">{activeCopy.label}</h3>
              <PanelLink activeTab={activeTab} />
            </div>

            {activeTab === "issues" ? <IssuePanel issues={openIssues} /> : null}
            {activeTab === "runs" ? <RunPanel runs={recentRuns} workflows={workflows} clients={clients} /> : null}
            {activeTab === "checks" ? <CheckPanel checks={scheduledChecks} /> : null}
            {activeTab === "readiness" ? <ReadinessPanel reliability={reliability} /> : null}
            {activeTab === "proof" ? <ProofPanel reportsDue={reportsDue} /> : null}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function IssuePanel({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return <EmptyPanel message="No reportable issues are open." />;
  }

  return (
    <div className="space-y-2">
      {issues.slice(0, 4).map((issue) => (
        <Link
          key={issue.id}
          href={`/issues/${issue.id}`}
          className="block rounded-lg border border-zinc-950/10 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-zinc-50"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-sm font-medium text-zinc-950">{issue.title}</p>
            <StatusBadge status={issue.status} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs/5 text-zinc-500">{issue.suggestedAction}</p>
        </Link>
      ))}
    </div>
  );
}

function RunPanel({
  runs,
  workflows,
  clients,
}: {
  runs: CheckRun[];
  workflows: Workflow[];
  clients: Client[];
}) {
  if (!runs.length) {
    return <EmptyPanel message="Run the first check to create history." />;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const workflow = workflows.find((candidate) => candidate.id === run.workflowId);
        const client = clients.find((candidate) => candidate.id === run.clientId);

        return (
          <Link
            key={run.id}
            href={`/workflows/${run.workflowId}`}
            className="block rounded-lg border border-zinc-950/10 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-zinc-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950">{workflow?.name ?? "Workflow"}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{client?.name ?? "Client"}</p>
              </div>
              <StatusBadge status={run.status} />
            </div>
            <p className="mt-1 text-xs/5 text-zinc-500">
              {run.statusCode ?? "-"} / {run.latencyMs} ms / {formatRelativeTime(run.completedAt)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function CheckPanel({ checks }: { checks: Check[] }) {
  if (!checks.length) {
    return <EmptyPanel message="No checks are enabled yet." />;
  }

  return (
    <div className="space-y-2">
      {checks.map((check) => (
        <div key={check.id} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950">{check.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
              <Clock3 size={13} aria-hidden="true" />
              {check.schedule}
            </p>
          </div>
          <StatusBadge status={check.latestStatus} />
        </div>
      ))}
    </div>
  );
}

function ReadinessPanel({ reliability }: { reliability: OperationalReliability }) {
  return (
    <div className="space-y-2">
      {reliability.checks.map((check) => {
        const Icon = check.status === "ready" ? CheckCircle2 : AlertTriangle;

        return (
          <div key={check.id} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
            <Icon
              size={16}
              aria-hidden="true"
              className={check.status === "ready" ? "mt-0.5 text-success" : "mt-0.5 text-amber-600"}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-950">{check.label}</p>
                <span className="text-xs text-zinc-500">{check.value}</span>
              </div>
              <p className="mt-1 text-xs/5 text-zinc-500">{check.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProofPanel({ reportsDue }: { reportsDue: number }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-lg bg-zinc-50 p-3">
        <p className="text-sm font-medium text-zinc-950">{reportsDue} reports due</p>
        <p className="mt-1 text-xs/5 text-zinc-500">
          Client reports needing action in this cycle.
        </p>
      </div>
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText size={17} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-950">Report source data is tenant-scoped</p>
          <p className="mt-1 text-xs/5 text-zinc-500">
            Client-safe summaries use stored check runs and issue records.
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelLink({ activeTab }: { activeTab: ActionCenterTab }) {
  if (activeTab === "issues") {
    return <ActionLink href="/issues">View all</ActionLink>;
  }

  if (activeTab === "runs" || activeTab === "checks") {
    return <ActionLink href="/checks">Open checks</ActionLink>;
  }

  if (activeTab === "proof") {
    return <ActionLink href="/reports">Open reports</ActionLink>;
  }

  return null;
}

function ActionLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="text-xs font-medium text-primary hover:text-primary/80">
      {children}
    </Link>
  );
}

function TabCount({ count, tone }: { count: number; tone: string }) {
  const className =
    tone === "danger"
      ? "bg-red-400/20 text-red-700"
      : tone === "warning"
        ? "bg-amber-400/20 text-amber-700"
        : tone === "success"
          ? "bg-lime-400/20 text-lime-700"
          : "bg-zinc-950/5 text-zinc-500";

  return (
    <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-semibold", className)}>
      {count}
    </span>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-zinc-50 p-3 text-sm/6 text-zinc-500">
      {message}
    </p>
  );
}
