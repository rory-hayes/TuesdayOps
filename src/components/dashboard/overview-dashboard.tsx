import { AlertTriangle, CheckCircle2, Clock3, FileText, UsersRound, Workflow } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getOpenIssues, getPortfolioSummary, getWorkflowHealthRows } from "@/lib/domain/summaries";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function OverviewDashboard({ data }: { data: TuesdayOpsSeedData }) {
  const summary = getPortfolioSummary(data);
  const openIssues = getOpenIssues(data);
  const workflowRows = getWorkflowHealthRows(data);
  const scheduledChecks = data.checks.filter((check) => check.enabled).slice(0, 4);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Operations overview</p>
          <div>
            <h2 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Client workflow health
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor live AI workflows, catch maintenance issues, and prepare monthly proof reports.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">June report cycle</span>
          <span className="mx-2 text-border">/</span>
          {data.clients.length} clients, {data.checks.length} checks
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active clients"
          value={summary.activeClients}
          detail="Retainers under monitoring"
          trend="+1 this month"
          icon={<UsersRound size={20} aria-hidden="true" />}
        />
        <MetricCard
          label="Monitored workflows"
          value={summary.monitoredWorkflows}
          detail="Included in reports"
          icon={<Workflow size={20} aria-hidden="true" />}
        />
        <MetricCard
          label="Open issues"
          value={summary.openIssues}
          detail="Reportable maintenance queue"
          icon={<AlertTriangle size={20} aria-hidden="true" />}
        />
        <MetricCard
          label="Check pass rate"
          value={formatPercentage(summary.checkPassRate)}
          detail="Across monitored workflows"
          trend="+3 pts"
          icon={<CheckCircle2 size={20} aria-hidden="true" />}
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Client workflow health</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Current status across live AI workflow endpoints.
              </p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Workflow</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Pass rate</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">Issues</th>
                  <th className="px-5 py-3 font-medium">Last check</th>
                </tr>
              </thead>
              <tbody>
                {workflowRows.length ? (
                  workflowRows.map((workflow) => (
                    <tr key={workflow.workflowId} className="border-b border-border last:border-0">
                      <td className="px-5 py-4 font-medium">{workflow.workflowName}</td>
                      <td className="px-5 py-4 text-muted-foreground">{workflow.clientName}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-5 py-4">{formatPercentage(workflow.passRate)}</td>
                      <td className="px-5 py-4">{workflow.latencyMs} ms</td>
                      <td className="px-5 py-4">{workflow.openIssues}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatRelativeTime(workflow.lastCheckAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={7}>
                      Add a client and workflow to start tracking live endpoint health.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Recent issues</h3>
              <p className="mt-1 text-sm text-muted-foreground">Failures and degraded checks to resolve.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {openIssues.length ? (
                openIssues.slice(0, 4).map((issue) => (
                  <div key={issue.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <StatusBadge status={issue.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{issue.suggestedAction}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  No reportable issues are open.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Scheduled checks</h3>
              <p className="mt-1 text-sm text-muted-foreground">Enabled checks due in the current cycle.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduledChecks.length ? (
                scheduledChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{check.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 size={13} aria-hidden="true" />
                        {check.schedule}
                      </p>
                    </div>
                    <StatusBadge status={check.latestStatus} />
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  No checks are enabled yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText size={19} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">Report source data is tenant-scoped</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Client-safe summaries will use stored check runs and issue records.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
