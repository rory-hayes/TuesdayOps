import Link from "next/link";
import { ArrowLeft, Download, FileText, Save, Send } from "lucide-react";
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
              confirmMessage="Send this report to the client recipient now?"
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
        <ReportDocument
          agencyName={data.agency.name}
          report={report}
          reportItems={reportItems}
        />

        <div className="grid gap-6">
          <ReportNarrativeEditor report={report} reportItems={reportItems} />

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
              {reportBlocked ? (
                <p className="rounded-lg bg-danger-background p-3 text-xs leading-5 text-danger">
                  Resolve blocked readiness items before exporting or sending this report.
                </p>
              ) : null}
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

function ReportDocument({
  agencyName,
  report,
  reportItems,
}: {
  agencyName: string;
  report: ReportSummary;
  reportItems: TuesdayOpsSeedData["reportItems"];
}) {
  const recommendations = report.recommendations.length
    ? report.recommendations
    : ["Generate report source data before sending."];

  return (
    <section className="min-w-0 overflow-hidden rounded-xl bg-zinc-100 p-4 ring-1 ring-zinc-950/5 sm:p-6">
      <article className="mx-auto w-full max-w-3xl bg-white p-5 shadow-[0_18px_60px_rgb(24_24_27_/_12%)] ring-1 ring-zinc-950/10 sm:p-9">
        <header className="border-b border-zinc-950/10 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div>
              <p className="text-sm font-semibold text-primary">{agencyName}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950">
                Monthly workflow maintenance report
              </h2>
              <p className="mt-2 text-sm font-medium text-zinc-700">Workflow maintenance proof</p>
              <p className="mt-2 text-sm text-zinc-500">
                Prepared for {report.clientName} - {report.periodLabel}
              </p>
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FileText size={22} aria-hidden="true" />
            </div>
          </div>
        </header>

        <section className="py-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Executive summary</p>
          <p className="mt-3 text-sm leading-7 text-zinc-700">{report.summary}</p>
        </section>

        <section className="grid gap-3 border-y border-zinc-950/10 py-5 sm:grid-cols-4">
          <DocumentMetric label="Workflows" value={report.workflowsMonitored.toString()} />
          <DocumentMetric label="Checks run" value={report.checksRun.toLocaleString("en-IE")} />
          <DocumentMetric label="Pass rate" value={formatPercentage(report.passRate)} />
          <DocumentMetric label="Resolved" value={report.issuesResolved.toString()} />
        </section>

        <section className="grid gap-3 py-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Report modules</p>
          {reportItems.length ? (
            reportItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-950/10 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
              No report items have been stored for this report.
            </p>
          )}
        </section>

        <section>
          <p className="text-xs font-semibold uppercase text-zinc-500">Recommendations</p>
          <div className="mt-3 grid gap-2">
            {recommendations.map((recommendation) => (
              <p key={recommendation} className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">
                {recommendation}
              </p>
            ))}
          </div>
        </section>
      </article>
    </section>
  );
}

function ReportNarrativeEditor({
  report,
  reportItems,
}: {
  report: ReportSummary;
  reportItems: TuesdayOpsSeedData["reportItems"];
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Review narrative</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit client-safe report copy before export or send.
        </p>
      </CardHeader>
      <CardContent>
        <form action={updateReportNarrativeAction} className="grid gap-4">
          <input type="hidden" name="reportId" value={report.id} />
          <NarrativeTextArea
            label="Executive summary"
            name="summary"
            defaultValue={report.summary}
            rows={5}
            required
            maxLength={2000}
          />
          <div className="grid gap-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Report sections</p>
            {reportItems.length ? (
              reportItems.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3">
                  <input type="hidden" name="reportItemId" value={item.id} />
                  <input type="hidden" name="reportItemCategory" value={item.category} />
                  <input type="hidden" name="reportItemSortOrder" value={item.sortOrder} />
                  <NarrativeInput
                    label={`${item.title} title`}
                    name="reportItemTitle"
                    defaultValue={item.title}
                    required
                    maxLength={120}
                  />
                  <NarrativeTextArea
                    label={`${item.title} body`}
                    name="reportItemBody"
                    defaultValue={item.body}
                    rows={4}
                    required
                    maxLength={1200}
                  />
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Generate report sections before editing this narrative.
              </p>
            )}
          </div>
          <NarrativeTextArea
            label="Recommendations"
            name="recommendations"
            defaultValue={report.recommendations.join("\n")}
            rows={4}
            maxLength={2000}
          />
          <FormSubmitButton type="submit" size="sm" className="w-fit" pendingLabel="Saving...">
            <Save size={15} aria-hidden="true" />
            Save narrative
          </FormSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function NarrativeInput({
  label,
  name,
  defaultValue,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function NarrativeTextArea({
  label,
  name,
  defaultValue,
  rows,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        required={required}
        maxLength={maxLength}
        className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-primary"
      />
    </label>
  );
}

function DocumentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
