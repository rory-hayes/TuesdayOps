import Link from "next/link";
import { ArrowLeft, Download, FileText, Send } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import type { ReportSummary, TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatDateTime, formatPercentage } from "@/lib/formatting";
import { buildReportQuality } from "@/lib/reports/quality";
import {
  generateReportPdfAction,
  sendReportAction,
} from "@/lib/reports/service";
import { cn } from "@/lib/utils";

export function ReportDetailPage({
  data,
  report,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  report: ReportSummary;
  notice?: string;
  error?: string;
}) {
  const client = data.clients.find((candidate) => candidate.id === report.clientId);
  const reportItems = data.reportItems
    .filter((item) => item.reportId === report.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const reportQuality = buildReportQuality({ data, reportId: report.id });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft size={15} aria-hidden="true" />
            Reports
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="success">white-label preview</Badge>
            <StatusBadge status={report.status} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">
            {report.clientName} {report.periodLabel}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {report.generatedAt
              ? `Generated ${formatDateTime(report.generatedAt)}`
              : "Generated from stored workflow checks, issues, and synthetic test runs."}
          </p>
        </div>
        <div className="flex gap-2">
          {report.pdfUrl ? (
            <a
              href={report.pdfUrl}
              download
              className={cn(
                "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-[#d7d0ca] hover:bg-muted",
              )}
            >
              <Download size={15} aria-hidden="true" />
              PDF
            </a>
          ) : (
            <form action={generateReportPdfAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <FormSubmitButton variant="secondary" size="sm" type="submit" pendingLabel="Preparing...">
                <Download size={15} aria-hidden="true" />
                PDF
              </FormSubmitButton>
            </form>
          )}
          <form action={sendReportAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <FormSubmitButton size="sm" type="submit" pendingLabel="Sending...">
              <Send size={15} aria-hidden="true" />
              Send
            </FormSubmitButton>
          </form>
        </div>
      </section>

      <PageFeedback notice={notice} error={error} />

      {report.sendError ? (
        <p className="rounded-lg bg-danger-background p-3 text-sm text-danger">{report.sendError}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <ReportStat label="Checks run" value={report.checksRun.toLocaleString("en-IE")} />
        <ReportStat label="Pass rate" value={formatPercentage(report.passRate)} />
        <ReportStat label="Issues caught" value={report.issuesCaught.toString()} />
        <ReportStat label="Workflows" value={report.workflowsMonitored.toString()} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Executive summary</p>
                <h2 className="mt-1 text-base font-semibold">Workflow maintenance proof</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">{report.summary}</p>

            <div className="grid gap-3">
              {reportItems.length ? (
                reportItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border px-4 py-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  No report items have been stored for this report.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold">Recommendations</h3>
              <div className="mt-3 space-y-2">
                {(report.recommendations.length
                  ? report.recommendations
                  : ["Generate report source data before sending."]
                ).map((recommendation) => (
                  <div key={recommendation} className="rounded-lg border border-border px-4 py-3 text-sm">
                    {recommendation}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Report readiness</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{reportQuality.status}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Client-send score</p>
                </div>
                <Badge variant={reportQuality.status === "ready" ? "success" : reportQuality.status === "review" ? "warning" : "danger"}>
                  {reportQuality.score}%
                </Badge>
              </div>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Client</h2>
            </CardHeader>
            <CardContent>
              {client ? (
                <Link href={`/clients/${client.id}`} className="font-medium hover:text-primary hover:underline">
                  {client.name}
                </Link>
              ) : (
                <p className="font-medium">{report.clientName}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                {client?.reportRecipientEmail ?? "Report recipient not available."}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
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
