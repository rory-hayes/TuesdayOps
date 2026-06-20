import Link from "next/link";
import { ArrowLeft, Download, Send } from "lucide-react";
import { EditableReportDocument } from "@/components/reports/editable-report-document";
import { ReportReadinessDialog } from "@/components/reports/report-readiness-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import type { ReportSummary, TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatDateTime, formatPercentage } from "@/lib/formatting";
import { buildReportQuality } from "@/lib/reports/quality";
import {
  generateReportPdfAction,
  sendReportAction,
  updateReportNarrativeAction,
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
  const reportBlocked = reportQuality.status === "blocked";

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
            <ReportReadinessDialog clientId={client?.id} quality={reportQuality} />
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
          {reportBlocked ? (
            <Button variant="secondary" size="sm" disabled>
              <Download size={15} aria-hidden="true" />
              PDF
            </Button>
          ) : report.pdfUrl ? (
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
              <FormSubmitButton
                variant="secondary"
                size="sm"
                type="submit"
                pendingLabel="Preparing..."
                disabled={reportBlocked}
              >
                <Download size={15} aria-hidden="true" />
                PDF
              </FormSubmitButton>
            </form>
          )}
          <form action={sendReportAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <FormSubmitButton
              size="sm"
              type="submit"
              pendingLabel="Sending..."
              disabled={reportBlocked}
              confirmMessage={`Are you sure you want to send report to ${report.clientName}?`}
            >
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
        <EditableReportDocument
          agencyName={data.agency.name}
          readOnly={report.status === "sent"}
          report={report}
          reportItems={reportItems}
          updateReportNarrativeAction={updateReportNarrativeAction}
        />

        <div className="grid gap-6">
          {report.status === "sent" ? (
            <SentReportReadOnlyNote />
          ) : null}

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

function SentReportReadOnlyNote() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Sent report preserved</h2>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">
          This report has already been sent. Sent report history is preserved, so narrative edits are disabled.
        </p>
      </CardContent>
    </Card>
  );
}
