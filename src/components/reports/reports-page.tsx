import { Download, FileText, Send } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { seedData } from "@/lib/data/seed";
import { getReportSummary } from "@/lib/domain/summaries";
import { formatPercentage } from "@/lib/formatting";

export function ReportsPage() {
  const report = getReportSummary(seedData, "client-nova", "2026-06");

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

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Report queue</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {seedData.reports.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-4">
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
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="success">white-label preview</Badge>
            <h2 className="mt-3 text-xl font-semibold">{report.clientName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{report.periodLabel} maintenance report</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Download size={15} aria-hidden="true" />
              PDF
            </Button>
            <Button size="sm">
              <Send size={15} aria-hidden="true" />
              Send
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Executive summary</p>
                <p className="mt-1 font-semibold">Workflow maintenance proof</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{report.summary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <ReportStat label="Checks run" value={report.checksRun.toLocaleString("en-IE")} />
            <ReportStat label="Pass rate" value={formatPercentage(report.passRate)} />
            <ReportStat label="Issues caught" value={report.issuesCaught.toString()} />
            <ReportStat label="Resolved" value={report.issuesResolved.toString()} />
          </div>

          <div>
            <h3 className="text-base font-semibold">Recommendations</h3>
            <div className="mt-3 space-y-2">
              {report.recommendations.map((recommendation) => (
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
