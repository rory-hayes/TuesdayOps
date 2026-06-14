import Link from "next/link";
import { Download, FileText, Send } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { getOpenIssues, getPortfolioSummary } from "@/lib/domain/summaries";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatDateTime, formatPercentage } from "@/lib/formatting";
import { buildReportQuality } from "@/lib/reports/quality";
import {
  generateReportAction,
  generateReportPdfAction,
  sendReportAction,
} from "@/lib/reports/service";
import { cn } from "@/lib/utils";

export function ReportsPage({
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
  const activeReport = data.reports[0];
  const activeReportItems = activeReport
    ? data.reportItems
        .filter((item) => item.reportId === activeReport.id)
        .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];
  const reportQuality = buildReportQuality({ data, reportId: activeReport?.id });

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">Reports</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            Monthly proof reports
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Client-safe summaries of what was monitored, caught, fixed, and improved.
          </p>
        </div>

        <PageFeedback notice={notice} error={error} />

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Generate monthly report</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a reproducible client report from stored checks, issues, and synthetic runs.
            </p>
          </CardHeader>
          <CardContent>
            {data.clients.length ? (
              <form action={generateReportAction} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                <label className="block text-sm font-medium">
                  Client
                  <select
                    required
                    name="clientId"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {data.clients
                      .filter((client) => !client.archived)
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Period
                  <input
                    required
                    name="period"
                    type="month"
                    defaultValue="2026-06"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
                <FormSubmitButton type="submit" className="self-end" pendingLabel="Generating...">
                  <FileText size={15} aria-hidden="true" />
                  Generate
                </FormSubmitButton>
              </form>
            ) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Add a client before generating reports.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Report queue</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.reports.length ? (
              data.reports.map((item) => (
                <Link
                  key={item.id}
                  href={`/reports/${item.id}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.clientName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.periodLabel}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <ReportStat label="Checks" value={item.checksRun.toLocaleString("en-IE")} />
                    <ReportStat label="Caught" value={item.issuesCaught.toString()} />
                    <ReportStat label="Fixed" value={item.issuesResolved.toString()} />
                  </div>
                  {item.sendError ? (
                    <p className="mt-3 rounded-lg bg-danger-background p-2 text-xs text-danger">
                      {item.sendError}
                    </p>
                  ) : null}
                </Link>
              ))
            ) : (
              <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Generate the first report once client workflow source data is available.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="success">white-label preview</Badge>
            <h2 className="mt-3 text-xl font-semibold">
              {activeReport ? `${activeReport.clientName} ${activeReport.periodLabel}` : "Report preview"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeReport?.generatedAt ? `Generated ${formatDateTime(activeReport.generatedAt)}` : "Current tenant data available for reporting"}
            </p>
          </div>
          <div className="flex gap-2">
            {activeReport?.pdfUrl ? (
              <a
                href={activeReport.pdfUrl}
                download
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-[#d7d0ca] hover:bg-muted",
                )}
              >
                <Download size={15} aria-hidden="true" />
                PDF
              </a>
            ) : activeReport ? (
              <form action={generateReportPdfAction}>
                <input type="hidden" name="reportId" value={activeReport.id} />
                <FormSubmitButton variant="secondary" size="sm" type="submit" pendingLabel="Preparing...">
                  <Download size={15} aria-hidden="true" />
                  PDF
                </FormSubmitButton>
              </form>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                <Download size={15} aria-hidden="true" />
                PDF
              </Button>
            )}
            {activeReport ? (
              <form action={sendReportAction}>
                <input type="hidden" name="reportId" value={activeReport.id} />
                <FormSubmitButton size="sm" type="submit" pendingLabel="Sending...">
                  <Send size={15} aria-hidden="true" />
                  Send
                </FormSubmitButton>
              </form>
            ) : (
              <Button size="sm" disabled>
                <Send size={15} aria-hidden="true" />
                Send
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Report readiness</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reportQuality.status === "ready"
                    ? "Ready for client review and send."
                    : reportQuality.status === "review"
                      ? "Review open risks before sending."
                      : "Generate or improve source data before sending."}
                </p>
              </div>
              <Badge variant={reportQuality.status === "ready" ? "success" : reportQuality.status === "review" ? "warning" : "danger"}>
                {reportQuality.score}%
              </Badge>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {reportQuality.checks.map((check) => (
                <div key={check.id} className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{check.label}</p>
                    <Badge variant={check.status === "ready" ? "success" : check.status === "warning" ? "warning" : "danger"}>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{check.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Executive summary</p>
                <p className="mt-1 font-semibold">
                  {activeReport ? "Workflow maintenance proof" : "Report source snapshot"}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              {activeReport?.summary ??
                "TuesdayOps can now persist clients, workflows, checks, issues, and test runs as report source data."}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <ReportStat
              label="Checks run"
              value={(activeReport?.checksRun ?? data.checkRuns.length).toLocaleString("en-IE")}
            />
            <ReportStat
              label="Pass rate"
              value={formatPercentage(activeReport?.passRate ?? summary.checkPassRate)}
            />
            <ReportStat
              label="Issues"
              value={(activeReport?.issuesCaught ?? openIssues.length).toString()}
            />
            <ReportStat
              label="Workflows"
              value={(activeReport?.workflowsMonitored ?? summary.monitoredWorkflows).toString()}
            />
          </div>

          <div className="grid gap-3">
            {activeReportItems.length ? (
              activeReportItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border px-4 py-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              ))
            ) : null}
          </div>

          <div>
            <h3 className="text-base font-semibold">Recommendations</h3>
            <div className="mt-3 space-y-2">
              {(activeReport?.recommendations.length
                ? activeReport.recommendations
                : ["Generate a report to create client-safe recommendations."]
              ).map((recommendation) => (
                <div key={recommendation} className="rounded-lg border border-border px-4 py-3 text-sm">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
