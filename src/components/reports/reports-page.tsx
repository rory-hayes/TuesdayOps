import Link from "next/link";
import { FileText } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/formatting";
import { generateReportAction } from "@/lib/reports/service";

export function ReportsPage({
  data,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section>
        <p className="text-sm font-medium text-primary">Reports</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
          Monthly proof reports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Generate, review, and send client-safe summaries of what was monitored, caught, fixed, and improved.
        </p>
      </section>

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
          <h2 className="text-base font-semibold">Report history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a generated report to review readiness, edit narrative copy, export PDF, or send it to the client.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.reports.length ? (
            data.reports.map((item) => (
              <Link
                key={item.id}
                href={`/reports/${item.id}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.clientName}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.periodLabel}</p>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 md:min-w-72">
                    <ReportTimestamp label="Generated" value={item.generatedAt ? formatDateTime(item.generatedAt) : "Queued"} />
                    <ReportTimestamp label={item.sentAt ? "Sent" : "Send status"} value={item.sentAt ? formatDateTime(item.sentAt) : "Not sent yet"} />
                  </div>
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
    </div>
  );
}

function ReportTimestamp({ label, value }: { label: string; value: string }) {
  return (
    <p className="grid gap-1 rounded-lg bg-muted p-3">
      <span className="font-medium uppercase text-zinc-500">{label}</span>
      <span>{value}</span>
    </p>
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
