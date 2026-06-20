import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileText, Inbox, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { PageFeedback } from "@/components/ui/page-feedback";
import { getOpenIssues, getPortfolioSummary } from "@/lib/domain/summaries";
import type { Check, CheckRun, Client, Issue, TuesdayOpsSeedData, Workflow } from "@/lib/domain/types";
import { formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";
import { buildOperationalReliability } from "@/lib/production/operational-reliability";
import { cn } from "@/lib/utils";

export type ActionCenterTab = "issues" | "runs" | "checks" | "readiness" | "proof";

const actionCenterTabs: Array<{ id: ActionCenterTab; label: string }> = [
  { id: "issues", label: "Issues" },
  { id: "runs", label: "Runs" },
  { id: "checks", label: "Checks" },
  { id: "readiness", label: "Readiness" },
  { id: "proof", label: "Proof" },
];

export function ActionCenterPage({
  data,
  activeTab,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  activeTab: ActionCenterTab;
  notice?: string;
  error?: string;
}) {
  const summary = getPortfolioSummary(data);
  const openIssues = getOpenIssues(data);
  const recentRuns = [...data.checkRuns]
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())
    .slice(0, 12);
  const scheduledChecks = [...data.checks]
    .filter((check) => check.enabled)
    .sort((left, right) => statusRank(right.latestStatus) - statusRank(left.latestStatus));
  const today = new Date().toISOString().slice(0, 10);
  const reportsDueClients = data.clients
    .filter((client) => !client.archived && client.nextReportDueOn && client.nextReportDueOn <= today)
    .sort((left, right) => (left.nextReportDueOn ?? "").localeCompare(right.nextReportDueOn ?? ""));
  const reliability = buildOperationalReliability({ data });
  const tabs = [
    { id: "issues" as const, count: openIssues.length },
    { id: "runs" as const, count: recentRuns.length },
    { id: "checks" as const, count: scheduledChecks.length },
    {
      id: "readiness" as const,
      count: reliability.checks.filter((check) => check.status === "attention").length,
    },
    { id: "proof" as const, count: reportsDueClients.length },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Operations</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950 md:text-3xl">
            Action center
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Triage the current maintenance queue, latest runs, scheduled checks, readiness signals, and report proof.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/issues"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-muted"
          >
            Open issues
          </Link>
          <Link
            href="/reports"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            Reports
          </Link>
        </div>
      </section>

      <PageFeedback notice={notice} error={error} />

      <section className="grid gap-4 md:grid-cols-4">
        <ActionMetric
          label="Open issues"
          value={summary.openIssues.toString()}
          detail="Reportable maintenance"
          tone={summary.openIssues ? "danger" : "success"}
        />
        <ActionMetric
          label="Latest runs"
          value={recentRuns.length.toString()}
          detail="Stored endpoint results"
          tone="muted"
        />
        <ActionMetric
          label="Enabled checks"
          value={scheduledChecks.length.toString()}
          detail="Running this cycle"
          tone="muted"
        />
        <ActionMetric
          label="Report proof"
          value={reportsDueClients.length.toString()}
          detail="Client reports due"
          tone={reportsDueClients.length ? "warning" : "success"}
        />
      </section>

      <ActionCenterTabs activeTab={activeTab} tabs={tabs} />

      {activeTab === "issues" ? <IssuesPanel issues={openIssues} data={data} /> : null}
      {activeTab === "runs" ? <RunsPanel runs={recentRuns} data={data} /> : null}
      {activeTab === "checks" ? <ChecksPanel checks={scheduledChecks} data={data} /> : null}
      {activeTab === "readiness" ? <ReadinessPanel ready={reliability.ready} checks={reliability.checks} /> : null}
      {activeTab === "proof" ? <ProofPanel clients={reportsDueClients} data={data} /> : null}
    </div>
  );
}

export function getActionCenterTab(value?: string): ActionCenterTab {
  return actionCenterTabs.some((tab) => tab.id === value) ? (value as ActionCenterTab) : "issues";
}

function ActionCenterTabs({
  activeTab,
  tabs,
}: {
  activeTab: ActionCenterTab;
  tabs: Array<{ id: ActionCenterTab; count: number }>;
}) {
  return (
    <nav aria-label="Action center sections" className="-mb-2 flex gap-2 overflow-x-auto border-b border-zinc-950/10">
      {tabs.map((tab) => {
        const tabCopy = actionCenterTabs.find((candidate) => candidate.id === tab.id);
        const active = tab.id === activeTab;

        return (
          <Link
            key={tab.id}
            href={`/action-center?tab=${tab.id}`}
            aria-current={active ? "page" : undefined}
            aria-label={`${tabCopy?.label ?? tab.id}, ${tab.count} ${tab.count === 1 ? "item" : "items"}`}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
              active
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:border-zinc-950/20 hover:text-zinc-950",
            )}
          >
            {tabCopy?.label}
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-semibold",
                active ? "bg-primary/10 text-primary" : "bg-zinc-950/5 text-zinc-500",
              )}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function IssuesPanel({ issues, data }: { issues: Issue[]; data: TuesdayOpsSeedData }) {
  if (!issues.length) {
    return (
      <EmptyState
        icon={Inbox}
        title="No open action items"
        body="Failed and degraded checks will appear here when they need a maintenance decision."
        actionHref="/checks"
        actionLabel="Open checks"
      />
    );
  }

  return (
    <Panel
      title="Maintenance inbox"
      description="Failed and degraded checks that need assignment, resolution, snooze, or report decisions."
      contentClassName="px-6 pb-6 pt-3"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm/6">
          <thead className="text-zinc-500">
            <tr className="border-b border-zinc-950/10">
              <th className="py-2.5 pr-6 font-medium">Issue</th>
              <th className="px-6 py-2.5 font-medium">Client / workflow</th>
              <th className="px-6 py-2.5 font-medium">Severity</th>
              <th className="px-6 py-2.5 font-medium">Owner</th>
              <th className="px-6 py-2.5 font-medium">Detected</th>
              <th className="py-2.5 pl-6 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => {
              const client = getClient(data, issue.clientId);
              const workflow = getWorkflow(data, issue.workflowId);

              return (
                <ClickableTableRow
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  label={`Open issue ${issue.title}`}
                  className="border-b border-zinc-950/5 last:border-0"
                >
                  <td className="py-3 pr-6">
                    <span className="font-semibold text-zinc-950 group-hover:text-primary">
                      {issue.title}
                    </span>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{issue.suggestedAction}</p>
                  </td>
                  <td className="px-6 py-3 text-zinc-500">
                    <span className="block text-zinc-950">{client?.name ?? "Unknown client"}</span>
                    <span>{workflow?.name ?? "Unknown workflow"}</span>
                  </td>
                  <td className="px-6 py-3">
                    <SeverityBadge severity={issue.severity} />
                  </td>
                  <td className="px-6 py-3 text-zinc-500">{issue.owner}</td>
                  <td className="px-6 py-3 text-zinc-500">{formatDateTime(issue.detectedAt)}</td>
                  <td className="py-3 pl-6">
                    <StatusBadge status={issue.status} />
                  </td>
                </ClickableTableRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RunsPanel({ runs, data }: { runs: CheckRun[]; data: TuesdayOpsSeedData }) {
  if (!runs.length) {
    return (
      <EmptyState
        icon={Activity}
        title="No check runs yet"
        body="Run the first health check from a workflow to create endpoint history."
        actionHref="/workflows"
        actionLabel="Open workflows"
      />
    );
  }

  return (
    <Panel
      title="Recent check runs"
      description="The latest stored endpoint results across monitored workflows."
      contentClassName="px-6 pb-6 pt-3"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm/6">
          <thead className="text-zinc-500">
            <tr className="border-b border-zinc-950/10">
              <th className="py-2.5 pr-6 font-medium">Workflow</th>
              <th className="px-6 py-2.5 font-medium">Client</th>
              <th className="px-6 py-2.5 font-medium">Result</th>
              <th className="px-6 py-2.5 font-medium">Status code</th>
              <th className="px-6 py-2.5 font-medium">Latency</th>
              <th className="py-2.5 pl-6 font-medium">Completed</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const client = getClient(data, run.clientId);
              const workflow = getWorkflow(data, run.workflowId);

              return (
                <ClickableTableRow
                  key={run.id}
                  href={`/workflows/${run.workflowId}`}
                  label={`Open workflow ${workflow?.name ?? "Unknown workflow"}`}
                  className="border-b border-zinc-950/5 last:border-0"
                >
                  <td className="py-3 pr-6">
                    <span className="font-semibold text-zinc-950 group-hover:text-primary">
                      {workflow?.name ?? "Unknown workflow"}
                    </span>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{run.responseSummary}</p>
                  </td>
                  <td className="px-6 py-3 text-zinc-500">{client?.name ?? "Unknown client"}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-6 py-3 text-zinc-500">{run.statusCode ?? "-"}</td>
                  <td className="px-6 py-3 text-zinc-500">{run.latencyMs} ms</td>
                  <td className="py-3 pl-6 text-zinc-500">{formatRelativeTime(run.completedAt)}</td>
                </ClickableTableRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ChecksPanel({ checks, data }: { checks: Check[]; data: TuesdayOpsSeedData }) {
  if (!checks.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No enabled checks"
        body="Enabled health checks will appear here with their schedule and latest result."
        actionHref="/checks"
        actionLabel="Create checks"
      />
    );
  }

  return (
    <Panel
      title="Scheduled checks"
      description="Enabled checks due in the current operating cycle."
      contentClassName="px-6 pb-6 pt-3"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm/6">
          <thead className="text-zinc-500">
            <tr className="border-b border-zinc-950/10">
              <th className="py-2.5 pr-6 font-medium">Check</th>
              <th className="px-6 py-2.5 font-medium">Workflow</th>
              <th className="px-6 py-2.5 font-medium">Client</th>
              <th className="px-6 py-2.5 font-medium">Schedule</th>
              <th className="py-2.5 pl-6 font-medium">Latest</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => {
              const workflow = getWorkflow(data, check.workflowId);
              const client = workflow ? getClient(data, workflow.clientId) : undefined;

              return (
                <ClickableTableRow
                  key={check.id}
                  href="/checks"
                  label={`Open checks for ${check.name}`}
                  className="border-b border-zinc-950/5 last:border-0"
                >
                  <td className="py-3 pr-6">
                    <span className="font-semibold text-zinc-950 group-hover:text-primary">
                      {check.name}
                    </span>
                    <p className="mt-1 text-xs text-zinc-500">{check.assertionCount} assertions</p>
                  </td>
                  <td className="px-6 py-3 text-zinc-500">{workflow?.name ?? "Unknown workflow"}</td>
                  <td className="px-6 py-3 text-zinc-500">{client?.name ?? "Unknown client"}</td>
                  <td className="px-6 py-3 text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={13} aria-hidden="true" />
                      {check.schedule}
                    </span>
                  </td>
                  <td className="py-3 pl-6">
                    <StatusBadge status={check.latestStatus} />
                  </td>
                </ClickableTableRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReadinessPanel({
  ready,
  checks,
}: {
  ready: boolean;
  checks: Array<{ id: string; label: string; status: "ready" | "attention"; value: number; detail: string }>;
}) {
  return (
    <Panel
      title="Operations readiness"
      description="Signals to review before a client maintenance report leaves the agency."
      action={<Badge variant={ready ? "success" : "warning"}>{ready ? "ready" : "review"}</Badge>}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {checks.map((check) => {
          const Icon = check.status === "ready" ? CheckCircle2 : AlertTriangle;

          return (
            <div key={check.id} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4">
              <Icon
                size={17}
                aria-hidden="true"
                className={check.status === "ready" ? "mt-0.5 text-success" : "mt-0.5 text-amber-600"}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-950">{check.label}</p>
                  <span className="text-xs text-zinc-500">{check.value}</span>
                </div>
                <p className="mt-1 text-sm/6 text-zinc-500">{check.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function ProofPanel({ clients, data }: { clients: Client[]; data: TuesdayOpsSeedData }) {
  return (
    <Panel
      title="Report proof"
      description="Client-safe report evidence built from stored check runs, issue records, and tenant-scoped summaries."
      action={<Link href="/reports" className="text-sm font-medium text-primary hover:text-primary/80">Open reports</Link>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="overflow-x-auto rounded-lg border border-zinc-950/10">
          <table className="w-full min-w-[680px] text-left text-sm/6">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.length ? (
                clients.map((client) => (
                  <ClickableTableRow
                    key={client.id}
                    href={`/clients/${client.id}`}
                    label={`Open client ${client.name}`}
                    className="border-t border-zinc-950/5"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-zinc-950 group-hover:text-primary">
                        {client.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{client.owner}</td>
                    <td className="px-4 py-3 text-zinc-500">{client.nextReportDueOn ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={reportStatusVariant(client.reportStatus)}>
                        {client.reportStatus.replaceAll("_", " ")}
                      </Badge>
                    </td>
                  </ClickableTableRow>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-sm text-zinc-500">
                    No client reports are due in this cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">Source data is tenant-scoped</p>
              <p className="mt-1 text-sm/6 text-zinc-500">
                Reports use {data.workflows.filter((workflow) => workflow.includedInReports).length} monitored workflows,
                {" "}
                {data.checkRuns.length} check runs, and {data.issues.length} issue records.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-950">Current pass rate</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {formatPercentage(getPortfolioSummary(data).checkPassRate)}
            </p>
            <p className="mt-1 text-sm/6 text-zinc-500">Across workflows included in reports.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Panel({
  title,
  description,
  action,
  contentClassName,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
          <p className="mt-1 text-sm/6 text-zinc-500">{description}</p>
        </div>
        {action}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

function ActionMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm/6 text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl/9 font-semibold tracking-tight text-zinc-950">{value}</p>
          </div>
          <Badge variant={tone}>
            {tone === "danger" ? "review" : tone === "warning" ? "due" : tone === "success" ? "ready" : "tracked"}
          </Badge>
        </div>
        <p className="mt-3 text-sm/6 text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-950/5 text-zinc-500">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-950">{title}</p>
          <p className="mt-1 text-sm/6 text-zinc-500">{body}</p>
          <Link href={actionHref} className="mt-3 inline-flex text-sm font-medium text-primary hover:text-primary/80">
            {actionLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: Issue["severity"] }) {
  const variant: "danger" | "warning" | "muted" =
    severity === "critical" || severity === "high" ? "danger" : severity === "medium" ? "warning" : "muted";

  return <Badge variant={variant}>{severity}</Badge>;
}

function reportStatusVariant(status: Client["reportStatus"]): "success" | "warning" | "muted" {
  if (status === "ready" || status === "sent") {
    return "success";
  }

  if (status === "draft") {
    return "warning";
  }

  return "muted";
}

function getClient(data: TuesdayOpsSeedData, clientId: string): Client | undefined {
  return data.clients.find((client) => client.id === clientId);
}

function getWorkflow(data: TuesdayOpsSeedData, workflowId: string): Workflow | undefined {
  return data.workflows.find((workflow) => workflow.id === workflowId);
}

function statusRank(status: CheckRun["status"]): number {
  const ranks: Record<CheckRun["status"], number> = {
    failed: 4,
    degraded: 3,
    skipped: 2,
    healthy: 1,
  };

  return ranks[status];
}
