import type { ReactNode } from "react";
import Link from "next/link";
import type { IssueSeverity, IssueStatus } from "@/lib/domain/types";
import { CheckCircle2, Filter, LifeBuoy, Play, UserPlus, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import {
  assignIssueToMeAction,
  ignoreIssueAction,
  rerunIssueCheckAction,
  resolveIssueAction,
  setIssueReportableAction,
} from "@/lib/issues/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatRelativeTime } from "@/lib/formatting";

const issueStatuses: IssueStatus[] = ["open", "in_review", "resolved", "ignored"];
const issueSeverities: IssueSeverity[] = ["critical", "high", "medium", "low"];

export type IssueFilters = {
  status?: IssueStatus | "all";
  severity?: IssueSeverity | "all";
  clientId?: string;
  workflowId?: string;
  error?: string;
  notice?: string;
};

export function IssuesPage({ data, filters = {} }: { data: TuesdayOpsSeedData; filters?: IssueFilters }) {
  const filteredIssues = data.issues.filter((issue) => {
    if (filters.status && filters.status !== "all" && issue.status !== filters.status) {
      return false;
    }

    if (filters.severity && filters.severity !== "all" && issue.severity !== filters.severity) {
      return false;
    }

    if (filters.clientId && issue.clientId !== filters.clientId) {
      return false;
    }

    if (filters.workflowId && issue.workflowId !== filters.workflowId) {
      return false;
    }

    return true;
  });

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

      <PageFeedback notice={filters.notice} error={filters.error} />

      <section className="grid gap-4 md:grid-cols-4">
        {issueStatuses.map((status) => (
          <Card key={status} className="shadow-none">
            <CardContent>
              <StatusBadge status={status} />
              <p className="mt-4 text-2xl font-semibold">
                {data.issues.filter((issue) => issue.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">Narrow the queue by client, workflow, status, or severity.</p>
          </div>
          <Filter size={18} className="text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <form action="/issues" className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]">
            <Select label="Status" name="status" defaultValue={filters.status ?? "all"}>
              <option value="all">All statuses</option>
              {issueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Select label="Severity" name="severity" defaultValue={filters.severity ?? "all"}>
              <option value="all">All severities</option>
              {issueSeverities.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </Select>
            <Select label="Client" name="clientId" defaultValue={filters.clientId ?? ""}>
              <option value="">All clients</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            <Select label="Workflow" name="workflowId" defaultValue={filters.workflowId ?? ""}>
              <option value="">All workflows</option>
              {data.workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </Select>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Filter size={15} aria-hidden="true" />
                Apply
              </Button>
            </div>
            <div className="flex items-end">
              <Link
                href="/issues"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-[#d7d0ca] hover:bg-muted"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Issue queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredIssues.length} of {data.issues.length} issues shown.
            </p>
          </div>
          <LifeBuoy size={18} className="text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredIssues.length ? filteredIssues.map((issue) => {
            const client = data.clients.find((candidate) => candidate.id === issue.clientId);
            const workflow = data.workflows.find((candidate) => candidate.id === issue.workflowId);

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
                    <h3 className="mt-3 font-semibold">
                      <Link href={`/issues/${issue.id}`} className="hover:text-primary hover:underline">
                        {issue.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.description}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatRelativeTime(issue.lastSeenAt)}</p>
                </div>
                <div className="mt-4 grid gap-3 rounded-lg bg-muted p-3 text-sm md:grid-cols-4">
                  <Info label="Client" value={client?.name ?? "Unknown"} />
                  <Info label="Workflow" value={workflow?.name ?? "Unknown"} />
                  <Info label="Owner" value={issue.owner} />
                  <Info label="Report" value={issue.reportable ? "Include" : "Exclude"} />
                </div>
                <details className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
                  <summary className="cursor-pointer font-medium">Issue details and actions</summary>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Info label="Detected" value={formatRelativeTime(issue.detectedAt)} />
                    <Info label="Last seen" value={formatRelativeTime(issue.lastSeenAt)} />
                    <Info label="Occurrences" value={issue.occurrenceCount.toString()} />
                  </div>
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-xs uppercase text-muted-foreground">Suggested action</p>
                    <p className="mt-1 leading-6">{issue.suggestedAction}</p>
                  </div>
                  {issue.resolutionNote ? (
                    <div className="mt-3 rounded-lg bg-muted p-3">
                      <p className="text-xs uppercase text-muted-foreground">Resolution note</p>
                      <p className="mt-1 leading-6">{issue.resolutionNote}</p>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {issue.checkRunId ? (
                      <form action={rerunIssueCheckAction}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Rerunning...">
                          <Play size={14} aria-hidden="true" />
                          Rerun check
                        </FormSubmitButton>
                      </form>
                    ) : null}
                    <form action={setIssueReportableAction}>
                      <input type="hidden" name="issueId" value={issue.id} />
                      <input type="hidden" name="reportable" value={issue.reportable ? "false" : "true"} />
                      <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Saving...">
                        {issue.reportable ? (
                          <XCircle size={14} aria-hidden="true" />
                        ) : (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        )}
                        {issue.reportable ? "Exclude from report" : "Mark reportable"}
                      </FormSubmitButton>
                    </form>
                  </div>
                  {issue.status === "resolved" || issue.status === "ignored" ? null : (
                    <div className="mt-4 grid gap-3 lg:grid-cols-[auto_auto_minmax(260px,1fr)]">
                      <form action={assignIssueToMeAction}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Assigning...">
                          <UserPlus size={14} aria-hidden="true" />
                          Assign
                        </FormSubmitButton>
                      </form>
                      <form action={ignoreIssueAction}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <FormSubmitButton
                          type="submit"
                          size="sm"
                          variant="ghost"
                          pendingLabel="Ignoring..."
                          confirmMessage="Ignore this issue and exclude it from reports?"
                        >
                          <XCircle size={14} aria-hidden="true" />
                          Ignore
                        </FormSubmitButton>
                      </form>
                      <form action={resolveIssueAction} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                        <input type="hidden" name="issueId" value={issue.id} />
                        <label className="block text-sm font-medium">
                          Resolution note
                          <textarea
                            name="resolutionNote"
                            rows={2}
                            minLength={3}
                            maxLength={600}
                            placeholder="Summarize the fix for the monthly report"
                            className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            required
                          />
                        </label>
                        <div className="flex items-center">
                          <FormSubmitButton type="submit" size="sm" pendingLabel="Resolving...">
                            <CheckCircle2 size={14} aria-hidden="true" />
                            Resolve
                          </FormSubmitButton>
                        </div>
                      </form>
                    </div>
                  )}
                </details>
              </article>
            );
          }) : (
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              No issues match these filters. Failed or degraded checks will appear here as maintenance work items.
            </p>
          )}
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

function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        key={`${name}-${defaultValue}`}
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      >
        {children}
      </select>
    </label>
  );
}
