import Link from "next/link";
import { Clock3, FileText } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getOpenIssues, getPortfolioSummary, getWorkflowHealthRows } from "@/lib/domain/summaries";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function OverviewDashboard({
  data,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
}) {
  const summary = getPortfolioSummary(data);
  const openIssues = getOpenIssues(data);
  const workflowRows = getWorkflowHealthRows(data);
  const scheduledChecks = data.checks.filter((check) => check.enabled).slice(0, 4);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl/8 font-semibold text-zinc-950 md:text-3xl/9">
            Good afternoon, {data.agency.name}
          </h1>
          <h2 className="mt-10 text-base/7 font-semibold text-zinc-950">Overview</h2>
        </div>
        <label className="w-full md:w-44">
          <span className="sr-only">Report cycle</span>
          <select
            defaultValue="2026-06"
            className="h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 text-zinc-950 shadow-sm outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="2026-06">June cycle</option>
            <option value="2026-05">May cycle</option>
            <option value="2026-Q2">Last quarter</option>
          </select>
        </label>
      </section>

      <OnboardingChecklist data={data} notice={notice} error={error} />

      <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        <OverviewStat label="Active clients" value={summary.activeClients.toString()} detail="retainers under monitoring" tone="positive" />
        <OverviewStat label="Monitored workflows" value={summary.monitoredWorkflows.toString()} detail="included in reports" tone="neutral" />
        <OverviewStat label="Open issues" value={summary.openIssues.toString()} detail="reportable maintenance queue" tone={summary.openIssues ? "negative" : "positive"} />
        <OverviewStat label="Check pass rate" value={formatPercentage(summary.checkPassRate)} detail="across monitored workflows" tone="positive" />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="min-w-0">
          <h2 className="text-base/7 font-semibold text-zinc-950">Client workflow health</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm/6">
              <thead className="text-zinc-500">
                <tr className="border-b border-zinc-950/10">
                  <th className="py-3 pr-6 font-medium">Workflow</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Pass rate</th>
                  <th className="px-6 py-3 font-medium">Latency</th>
                  <th className="px-6 py-3 font-medium">Issues</th>
                  <th className="py-3 pl-6 font-medium">Last check</th>
                </tr>
              </thead>
              <tbody>
                {workflowRows.length ? (
                  workflowRows.map((workflow) => (
                    <tr key={workflow.workflowId} className="border-b border-zinc-950/5 last:border-0">
                      <td className="py-4 pr-6 font-medium text-zinc-950">
                        <Link href={`/workflows/${workflow.workflowId}`} className="hover:text-zinc-700">
                          {workflow.workflowName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{workflow.clientName}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-6 py-4">{formatPercentage(workflow.passRate)}</td>
                      <td className="px-6 py-4">{workflow.latencyMs} ms</td>
                      <td className="px-6 py-4">{workflow.openIssues}</td>
                      <td className="py-4 pl-6 text-zinc-500">
                        {formatRelativeTime(workflow.lastCheckAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-10 text-sm/6 text-zinc-500" colSpan={7}>
                      Add a client and workflow to start tracking live endpoint health.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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

function OverviewStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "bg-lime-400/20 text-lime-700"
      : tone === "negative"
        ? "bg-pink-400/15 text-pink-700"
        : "bg-zinc-950/5 text-zinc-600";

  return (
    <div className="border-t border-zinc-950/10 pt-6">
      <p className="text-sm/6 text-zinc-950">{label}</p>
      <p className="mt-3 text-3xl/9 font-semibold tracking-tight text-zinc-950">{value}</p>
      <p className="mt-3 text-sm/6 text-zinc-500">
        <span className={`mr-2 rounded-md px-1.5 py-0.5 text-xs/5 font-medium ${toneClass}`}>
          {tone === "negative" ? "review" : tone === "positive" ? "ready" : "tracked"}
        </span>
        {detail}
      </p>
    </div>
  );
}
