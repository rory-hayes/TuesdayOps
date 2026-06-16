import Link from "next/link";
import { ArrowLeft, CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import {
  assignIssueToMeAction,
  ignoreIssueAction,
  resolveIssueAction,
} from "@/lib/issues/service";
import type { Issue, TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatDateTime, formatRelativeTime } from "@/lib/formatting";

export function IssueDetailPage({
  data,
  issue,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  issue: Issue;
  notice?: string;
  error?: string;
}) {
  const client = data.clients.find((candidate) => candidate.id === issue.clientId);
  const workflow = data.workflows.find((candidate) => candidate.id === issue.workflowId);
  const checkRun = issue.checkRunId
    ? data.checkRuns.find((candidate) => candidate.id === issue.checkRunId)
    : undefined;
  const testRun = issue.testRunId
    ? data.testRuns.find((candidate) => candidate.id === issue.testRunId)
    : undefined;
  const returnTo = `/issues/${issue.id}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link href="/issues" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft size={15} aria-hidden="true" />
            Issues
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">{issue.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
        </div>
        <p className="text-sm text-muted-foreground">Last seen {formatRelativeTime(issue.lastSeenAt)}</p>
      </section>

      <PageFeedback notice={notice} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-none">
          <CardContent>
            <p className="text-sm text-muted-foreground">Client</p>
            {client ? (
              <Link href={`/clients/${client.id}`} className="mt-3 block text-lg font-semibold hover:text-primary hover:underline">
                {client.name}
              </Link>
            ) : (
              <p className="mt-3 text-lg font-semibold">Unknown</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent>
            <p className="text-sm text-muted-foreground">Workflow</p>
            {workflow ? (
              <Link href={`/workflows/${workflow.id}`} className="mt-3 block text-lg font-semibold hover:text-primary hover:underline">
                {workflow.name}
              </Link>
            ) : (
              <p className="mt-3 text-lg font-semibold">Unknown</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent>
            <p className="text-sm text-muted-foreground">Occurrences</p>
            <p className="mt-3 text-lg font-semibold">{issue.occurrenceCount}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Issue details and actions</h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Detected" value={`${formatRelativeTime(issue.detectedAt)} (${formatDateTime(issue.detectedAt)})`} />
            <Info label="Last seen" value={`${formatRelativeTime(issue.lastSeenAt)} (${formatDateTime(issue.lastSeenAt)})`} />
            <Info label="Owner" value={issue.owner} />
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs uppercase text-muted-foreground">Suggested action</p>
            <p className="mt-2 leading-6">{issue.suggestedAction}</p>
          </div>

          {checkRun || testRun ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Source" value={checkRun ? "Health check run" : "Synthetic test run"} />
              <Info label="Status" value={checkRun?.status ?? testRun?.status ?? "-"} />
              <Info
                label="Summary"
                value={checkRun?.errorMessage ?? checkRun?.responseSummary ?? testRun?.errorMessage ?? testRun?.responseSummary ?? "-"}
              />
            </div>
          ) : null}

          {issue.resolutionNote ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs uppercase text-muted-foreground">Resolution note</p>
              <p className="mt-2 leading-6">{issue.resolutionNote}</p>
            </div>
          ) : null}

          {issue.status === "resolved" || issue.status === "ignored" ? null : (
            <div className="grid gap-3 lg:grid-cols-[auto_auto_minmax(280px,1fr)]">
              <form action={assignIssueToMeAction}>
                <input type="hidden" name="issueId" value={issue.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Assigning...">
                  <UserPlus size={14} aria-hidden="true" />
                  Assign
                </FormSubmitButton>
              </form>
              <form action={ignoreIssueAction}>
                <input type="hidden" name="issueId" value={issue.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
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
                <input type="hidden" name="returnTo" value={returnTo} />
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
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
