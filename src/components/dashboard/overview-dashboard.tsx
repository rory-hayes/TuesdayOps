import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { MiniBarChart, MiniLineChart } from "@/components/charts/simple-charts";
import { PageFeedback } from "@/components/ui/page-feedback";
import { getPortfolioSummary, getWorkflowHealthRows } from "@/lib/domain/summaries";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";
import {
  buildChecksRunSeries,
  buildIssuesBySeveritySeries,
  buildPassRateTrend,
} from "@/lib/dashboard/charts";
import type { WorkflowHealthRow } from "@/lib/domain/types";

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
  const workflowRows = getWorkflowHealthRows(data);
  const today = new Date().toISOString().slice(0, 10);
  const reportsDue = data.clients.filter(
    (client) => !client.archived && client.nextReportDueOn && client.nextReportDueOn <= today,
  ).length;
  const passRateTrend = buildPassRateTrend(data.checkRuns);
  const checkVolume = buildChecksRunSeries(data.checkRuns);
  const issuesBySeverity = buildIssuesBySeveritySeries(data.issues);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl/8 font-semibold text-zinc-950 md:text-3xl/9">
            Operations overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm/6 text-zinc-500">
            {data.agency.name} client workflow health, issue load, and report readiness.
          </p>
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

      <PageFeedback notice={notice} error={error} />

      <OnboardingChecklist data={data} />

      <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-5">
        <OverviewStat label="Active clients" value={summary.activeClients.toString()} detail="retainers under monitoring" tone="positive" />
        <OverviewStat label="Monitored workflows" value={summary.monitoredWorkflows.toString()} detail="included in reports" tone="neutral" />
        <OverviewStat label="Open issues" value={summary.openIssues.toString()} detail="reportable maintenance queue" tone={summary.openIssues ? "negative" : "positive"} />
        <OverviewStat label="Check pass rate" value={formatPercentage(summary.checkPassRate)} detail="across monitored workflows" tone="positive" />
        <OverviewStat label="Reports due" value={reportsDue.toString()} detail="client reports needing action" tone={reportsDue ? "negative" : "positive"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MiniLineChart label="Pass-rate trend" points={passRateTrend} suffix="%" />
        <MiniBarChart label="Checks run" points={checkVolume} />
        <MiniBarChart label="Open issues by severity" points={issuesBySeverity} tone="risk" />
      </section>

      <section className="min-w-0">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base/7 font-semibold text-zinc-950">Client workflow health</h2>
            <p className="mt-1 text-sm/6 text-zinc-500">
              Core monitored workflows across active clients.
            </p>
          </div>
          <Link href="/action-center" className="text-sm font-medium text-primary hover:text-primary/80">
            Open action center
          </Link>
        </div>
        {workflowRows.length ? (
          <>
            <div className="mt-4 grid gap-3 md:hidden">
              {workflowRows.map((workflow) => (
                <WorkflowHealthMobileCard key={workflow.workflowId} workflow={workflow} />
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto md:block">
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
                  {workflowRows.map((workflow) => (
                    <tr key={workflow.workflowId} className="border-b border-zinc-950/5 last:border-0">
                      <td className="py-3 pr-6 font-medium text-zinc-950">
                        <Link href={`/workflows/${workflow.workflowId}`} className="hover:text-zinc-700">
                          {workflow.workflowName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-zinc-500">{workflow.clientName}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-6 py-3">{formatPercentage(workflow.passRate)}</td>
                      <td className="px-6 py-3">{workflow.latencyMs} ms</td>
                      <td className="px-6 py-3">{workflow.openIssues}</td>
                      <td className="py-3 pl-6 text-zinc-500">
                        {formatWorkflowLastCheck(workflow.lastCheckAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm/6 text-zinc-500 ring-1 ring-zinc-950/5">
            Add a client and workflow to start tracking live endpoint health.
          </p>
        )}
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

function WorkflowHealthMobileCard({ workflow }: { workflow: WorkflowHealthRow }) {
  return (
    <Link
      href={`/workflows/${workflow.workflowId}`}
      className="block rounded-lg border border-zinc-950/10 bg-white p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">{workflow.workflowName}</p>
          <p className="mt-1 truncate text-xs leading-5 text-zinc-500">{workflow.clientName}</p>
        </div>
        <StatusBadge status={workflow.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase text-zinc-500">Pass rate</dt>
          <dd className="mt-1 font-medium text-zinc-950">{formatPercentage(workflow.passRate)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Latency</dt>
          <dd className="mt-1 font-medium text-zinc-950">{workflow.latencyMs} ms</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Issues</dt>
          <dd className="mt-1 font-medium text-zinc-950">{workflow.openIssues}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Last check</dt>
          <dd className="mt-1 font-medium text-zinc-950">{formatWorkflowLastCheck(workflow.lastCheckAt)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function formatWorkflowLastCheck(value?: string): string {
  return value ? formatRelativeTime(value) : "Not run yet";
}
