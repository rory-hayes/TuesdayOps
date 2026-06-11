import type { IssueStatus } from "@/lib/domain/types";
import { LifeBuoy } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { seedData } from "@/lib/data/seed";
import { formatRelativeTime } from "@/lib/formatting";

const issueStatuses: IssueStatus[] = ["open", "in_review", "resolved", "ignored"];

export function IssuesPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section>
        <p className="text-sm font-medium text-primary">Issues</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
          Maintenance queue
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Failed and degraded checks become clear operational work items for the agency team.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {issueStatuses.map((status) => (
          <Card key={status} className="shadow-none">
            <CardContent>
              <StatusBadge status={status} />
              <p className="mt-4 text-2xl font-semibold">
                {seedData.issues.filter((issue) => issue.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Issue queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">Report-safe maintenance context.</p>
          </div>
          <LifeBuoy size={18} className="text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-3">
          {seedData.issues.map((issue) => {
            const client = seedData.clients.find((candidate) => candidate.id === issue.clientId);
            const workflow = seedData.workflows.find((candidate) => candidate.id === issue.workflowId);

            return (
              <article key={issue.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          issue.severity === "critical" || issue.severity === "high"
                            ? "danger"
                            : issue.severity === "medium"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {issue.severity}
                      </Badge>
                      <StatusBadge status={issue.status} />
                    </div>
                    <h3 className="mt-3 font-semibold">{issue.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.description}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatRelativeTime(issue.detectedAt)}</p>
                </div>
                <div className="mt-4 grid gap-3 rounded-lg bg-muted p-3 text-sm md:grid-cols-4">
                  <Info label="Client" value={client?.name ?? "Unknown"} />
                  <Info label="Workflow" value={workflow?.name ?? "Unknown"} />
                  <Info label="Owner" value={issue.owner} />
                  <Info label="Report" value={issue.reportable ? "Include" : "Exclude"} />
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
