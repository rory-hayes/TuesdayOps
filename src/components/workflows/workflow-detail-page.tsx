import Link from "next/link";
import { ArrowLeft, Cog, LockKeyhole, Play, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { MiniLineChart } from "@/components/charts/simple-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { RunLogKeyPanel } from "@/components/workflows/run-log-key-panel";
import { createCheckAction, runCheckAction, updateCheckAction } from "@/lib/checks/service";
import type {
  Check,
  CheckRun,
  Client,
  Issue,
  TuesdayOpsSeedData,
  Workflow,
  WorkflowApiKeySummary,
} from "@/lib/domain/types";
import { archiveWorkflowAction, updateWorkflowAction } from "@/lib/workflows/service";
import { formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";
import { buildChangeComparison } from "@/lib/reports/change-comparison";
import { buildPassRateTrend } from "@/lib/dashboard/charts";
import { cn } from "@/lib/utils";

type WorkflowDetailTab = "overview" | "checks" | "api" | "endpoint" | "settings";
type ChangeComparison = ReturnType<typeof buildChangeComparison>;

const workflowDetailTabs: Array<{ id: WorkflowDetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "checks", label: "Checks" },
  { id: "api", label: "API & validation" },
  { id: "endpoint", label: "Endpoint" },
  { id: "settings", label: "Settings" },
];

export function WorkflowDetailPage({
  data,
  workflow,
  notice,
  error,
  activeTab,
}: {
  data: TuesdayOpsSeedData;
  workflow: Workflow;
  notice?: string;
  error?: string;
  activeTab?: string;
}) {
  const tab = getActiveTab(activeTab);
  const client = data.clients.find((candidate) => candidate.id === workflow.clientId);
  const checks = data.checks.filter((check) => check.workflowId === workflow.id);
  const runs = data.checkRuns.filter((run) => run.workflowId === workflow.id);
  const workflowIssues = data.issues
    .filter((issue) => issue.workflowId === workflow.id)
    .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime());
  const primaryCheck = checks.find((check) => check.enabled && check.type === "health") ?? checks.find((check) => check.enabled);
  const changeComparison = buildChangeComparison(runs.map((run) => ({
    status: run.status,
    latencyMs: run.latencyMs,
    costEstimate: run.costEstimate,
    model: run.model,
    promptVersion: run.promptVersion,
    completedAt: run.completedAt,
  })));
  const activeRunLogKeys = data.workflowApiKeys.filter(
    (key) => key.workflowId === workflow.id && !key.revokedAt,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link href="/workflows" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft size={15} aria-hidden="true" />
            Workflows
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">{workflow.name}</h1>
            <Link
              href={`/workflows/${workflow.id}?tab=settings`}
              aria-label="Workflow settings"
              aria-current={tab === "settings" ? "page" : undefined}
              className={cn(
                "grid size-9 place-items-center rounded-lg border border-zinc-950/10 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10",
                tab === "settings" && "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white",
              )}
            >
              <Cog size={17} aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {client?.name ?? "Unknown client"} endpoint health, assertions, and manual run history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {primaryCheck ? (
            <form action={runCheckAction}>
              <input type="hidden" name="checkId" value={primaryCheck.id} />
              <input type="hidden" name="returnTab" value="overview" />
              <FormSubmitButton type="submit" size="sm" pendingLabel="Running...">
                <Play size={14} aria-hidden="true" />
                Run Check
              </FormSubmitButton>
            </form>
          ) : (
            <Link
              href={`/workflows/${workflow.id}?tab=checks`}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <Plus size={14} aria-hidden="true" />
              Add check
            </Link>
          )}
          <StatusBadge status={workflow.status} />
          <form action={archiveWorkflowAction}>
            <input type="hidden" name="id" value={workflow.id} />
            <FormSubmitButton
              type="submit"
              variant="secondary"
              size="sm"
              pendingLabel="Archiving..."
              confirmMessage="Archive this workflow? Historical runs and reports will be preserved."
            >
              Archive
            </FormSubmitButton>
          </form>
        </div>
      </section>

      <PageFeedback notice={notice} error={error} />

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Pass rate" value={formatPercentage(workflow.passRate)} />
        <Stat label="Latency" value={`${workflow.latencyMs} ms`} />
        <Stat label="Checks" value={checks.length.toString()} />
        <Stat label="Last check" value={formatWorkflowLastCheck(workflow.lastCheckAt)} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">Endpoint</p>
            <p className="mt-2 break-all font-mono text-sm leading-6 text-zinc-800">{workflow.endpointUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{workflow.method}</Badge>
            <Badge variant="muted">{workflow.environment}</Badge>
            <Badge variant="muted">{workflow.type.replaceAll("_", " ")}</Badge>
            <Badge variant="muted">{formatFrequency(workflow.checkFrequencyMinutes)}</Badge>
            <Badge variant={workflow.includedInReports ? "success" : "muted"}>
              {workflow.includedInReports ? "report included" : "not in reports"}
            </Badge>
          </div>
        </div>
      </section>

      <WorkflowTabs workflowId={workflow.id} activeTab={tab} />

      {tab === "overview" ? <OverviewTab runs={runs} issues={workflowIssues} /> : null}
      {tab === "checks" ? <ChecksTab workflow={workflow} checks={checks} /> : null}
      {tab === "api" ? (
        <ApiValidationTab
          workflowId={workflow.id}
          activeRunLogKeys={activeRunLogKeys}
          changeComparison={changeComparison}
        />
      ) : null}
      {tab === "endpoint" ? <EndpointTab workflow={workflow} client={client} /> : null}
      {tab === "settings" ? <WorkflowSettingsTab workflow={workflow} primaryCheck={primaryCheck} /> : null}
    </div>
  );
}

function getActiveTab(value?: string): WorkflowDetailTab {
  return workflowDetailTabs.some((tab) => tab.id === value) ? (value as WorkflowDetailTab) : "overview";
}

function WorkflowTabs({
  workflowId,
  activeTab,
}: {
  workflowId: string;
  activeTab: WorkflowDetailTab;
}) {
  return (
    <nav aria-label="Workflow detail sections" className="-mb-2 flex gap-2 overflow-x-auto border-b border-zinc-950/10">
      {workflowDetailTabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            key={tab.id}
            href={`/workflows/${workflowId}?tab=${tab.id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
              active
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:border-zinc-950/20 hover:text-zinc-950",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function OverviewTab({ runs, issues }: { runs: CheckRun[]; issues: Issue[] }) {
  const latestRun = runs[0];

  return (
    <section className="grid gap-6">
      <MiniLineChart
        label="Workflow pass-rate trend"
        points={buildPassRateTrend(runs)}
        suffix="%"
        className="bg-white p-5 shadow-[var(--shadow-soft)]"
        chartClassName="h-52 sm:h-64"
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,0.7fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Latest run</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The most recent stored health signal for this workflow.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestRun ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={latestRun.status} />
                  <span className="text-sm text-muted-foreground">{formatDateTime(latestRun.completedAt)}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Status code" value={latestRun.statusCode?.toString() ?? "-"} />
                  <Info label="Latency" value={`${latestRun.latencyMs} ms`} />
                </div>
                <p className="rounded-lg bg-muted p-3 text-sm leading-6 text-muted-foreground">
                  {formatRunSummary(latestRun)}
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Run a check to create the first workflow history entry.
              </p>
            )}
          </CardContent>
        </Card>

        <RunHistoryCard runs={runs} />
      </div>

      <WorkflowIssuesCard issues={issues} />
    </section>
  );
}

function ChecksTab({
  workflow,
  checks,
}: {
  workflow: Workflow;
  checks: Check[];
}) {
  return (
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
      <ChecksCard checks={checks} />
      <AddCheckCard workflowId={workflow.id} />
    </section>
  );
}

function ApiValidationTab({
  workflowId,
  activeRunLogKeys,
  changeComparison,
}: {
  workflowId: string;
  activeRunLogKeys: WorkflowApiKeySummary[];
  changeComparison: ChangeComparison;
}) {
  return (
    <section className="grid items-start gap-6 xl:grid-cols-2">
      <RunLogKeyPanel workflowId={workflowId} activeKeys={activeRunLogKeys} />
      <ChangeValidationCard changeComparison={changeComparison} />
    </section>
  );
}

function EndpointTab({
  workflow,
  client,
}: {
  workflow: Workflow;
  client?: Client;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Endpoint</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stored connection metadata for the monitored workflow.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Info label="URL" value={workflow.endpointUrl} />
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Client" value={client?.name ?? "Unknown"} />
            <Info label="Method" value={workflow.method} />
            <Info label="Environment" value={workflow.environment} />
            <Info label="Type" value={workflow.type.replaceAll("_", " ")} />
            <Info label="Frequency" value={`${workflow.checkFrequencyMinutes} minutes`} />
            <Info label="Auth type" value={workflow.authType.replaceAll("_", " ")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Secret handling</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Endpoint credentials are intentionally not displayed here.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm leading-6 text-muted-foreground">
            <LockKeyhole size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            Workflow auth config is encrypted at rest, redacted from reports, and never returned to the browser.
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function WorkflowSettingsTab({ workflow, primaryCheck }: { workflow: Workflow; primaryCheck?: Check }) {
  return (
    <section className="max-w-4xl">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Workflow settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update endpoint metadata, auth rotation, health-check assertions, and report inclusion.
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateWorkflowAction} className="grid gap-4">
            <input type="hidden" name="id" value={workflow.id} />
            <input type="hidden" name="returnTab" value="settings" />
            <Input label="Name" name="name" placeholder="Workflow name" defaultValue={workflow.name} required />
            <Input
              label="Endpoint URL"
              name="endpointUrl"
              placeholder="https://example.com/api/health"
              type="url"
              defaultValue={workflow.endpointUrl}
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Type
                <select
                  name="type"
                  defaultValue={workflow.type}
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="http_endpoint">HTTP endpoint</option>
                  <option value="webhook">Webhook</option>
                  <option value="n8n">n8n</option>
                  <option value="make">Make</option>
                  <option value="zapier">Zapier</option>
                  <option value="mcp_server">MCP server</option>
                  <option value="custom_api">Custom API</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Environment
                <select
                  name="environment"
                  defaultValue={workflow.environment}
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Method
                <select
                  name="method"
                  defaultValue={workflow.method}
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </label>
              <Input
                label="Frequency minutes"
                name="checkFrequencyMinutes"
                placeholder="60"
                type="number"
                defaultValue={workflow.checkFrequencyMinutes.toString()}
                required
              />
            </div>
            <div className="grid gap-3 rounded-lg border border-border p-4">
              <div>
                <h3 className="text-sm font-semibold">Authentication</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Leave the secret blank to keep the current encrypted credential.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Auth type
                  <select
                    name="authType"
                    defaultValue={workflow.authType}
                    className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer token</option>
                    <option value="api_key_header">API key header</option>
                    <option value="basic">Basic auth</option>
                  </select>
                </label>
                <Input
                  label="New auth secret"
                  name="authSecret"
                  placeholder="Leave blank to keep current"
                  type="password"
                />
                <Input
                  label="API key header name"
                  name="authHeaderName"
                  placeholder="x-api-key"
                />
                <Input
                  label="Basic username"
                  name="basicUsername"
                  placeholder="username"
                />
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border border-border p-4">
              <div>
                <h3 className="text-sm font-semibold">Primary health check</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These settings update the main scheduled health check for this workflow.
                </p>
              </div>
              <HealthCheckFields configJson={primaryCheck?.configJson} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                name="includedInReports"
                type="checkbox"
                defaultChecked={workflow.includedInReports}
                className="size-4 rounded border-border"
              />
              Include in reports
            </label>
            <FormSubmitButton type="submit" className="w-fit" pendingLabel="Saving...">
              Save workflow
            </FormSubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function ChecksCard({ checks }: { checks: Check[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Checks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manual runs save status, latency, and assertions.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.length ? (
          checks.map((check) => (
            <div key={check.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium">{check.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="muted">{check.schedule}</Badge>
                    <Badge variant="muted">{check.assertionCount} assertions</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={check.latestStatus} />
                  <form action={runCheckAction}>
                    <input type="hidden" name="checkId" value={check.id} />
                    <input type="hidden" name="returnTab" value="checks" />
                    <FormSubmitButton type="submit" size="sm" pendingLabel="Running...">
                      <Play size={14} aria-hidden="true" />
                      Run
                    </FormSubmitButton>
                  </form>
                </div>
              </div>
              <details className="mt-4 rounded-lg bg-muted p-3">
                <summary className="cursor-pointer text-sm font-medium">Edit check settings</summary>
                <form action={updateCheckAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="checkId" value={check.id} />
                  <input type="hidden" name="returnTab" value="checks" />
                  <Input label="Name" name="name" placeholder="Endpoint responds with 200" defaultValue={check.name} required />
                  <HealthCheckFields configJson={check.configJson} />
                  <FormSubmitButton type="submit" size="sm" variant="secondary" className="w-fit" pendingLabel="Saving...">
                    Save check
                  </FormSubmitButton>
                </form>
              </details>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            No checks are attached to this workflow yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AddCheckCard({ workflowId }: { workflowId: string }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Add check</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create another lightweight assertion pack.</p>
      </CardHeader>
      <CardContent>
        <form action={createCheckAction} className="grid gap-3">
          <input type="hidden" name="workflowId" value={workflowId} />
          <input type="hidden" name="returnTab" value="checks" />
          <Input label="Name" name="name" placeholder="Endpoint responds with 200" required />
          <HealthCheckFields />
          <FormSubmitButton type="submit" className="w-fit" pendingLabel="Adding...">
            <Plus size={15} aria-hidden="true" />
            Add check
          </FormSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangeValidationCard({ changeComparison }: { changeComparison: ChangeComparison }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Change validation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lightweight model and prompt comparisons from logged runs.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {changeComparison.groups.length ? (
          changeComparison.groups.slice(0, 3).map((group) => (
            <div key={group.label} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{group.label}</p>
                <Badge variant={group.passRate >= 90 ? "success" : group.passRate >= 70 ? "warning" : "danger"}>
                  {group.passRate}% pass
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {group.runs} runs - {group.averageLatencyMs}ms average latency
                {group.averageCostEstimate === undefined ? "" : ` - ${group.averageCostEstimate} average cost`}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Add model or prompt version metadata through the run logging API to compare changes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RunHistoryCard({ runs }: { runs: CheckRun[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Run history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Latest stored check runs for this endpoint.</p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Latency</th>
              <th className="px-5 py-3 font-medium">Completed</th>
              <th className="px-5 py-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {runs.length ? (
              runs.slice(0, 10).map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-5 py-4">{run.statusCode ?? "-"}</td>
                  <td className="px-5 py-4">{run.latencyMs} ms</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDateTime(run.completedAt)}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <span
                      className="block max-w-80 whitespace-normal break-words"
                      title={run.errorMessage ?? run.responseSummary}
                    >
                      {formatRunSummary(run)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={5}>
                  Run a check to create the first history entry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function WorkflowIssuesCard({ issues }: { issues: Issue[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Issues</h2>
        <p className="mt-1 text-sm text-muted-foreground">Recent maintenance work linked to this workflow.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.length ? (
          issues.slice(0, 5).map((issue) => (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="grid gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted md:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
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
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{issue.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{issue.suggestedAction}</p>
              </div>
              <StatusBadge status={issue.status} />
              <span className="text-xs text-muted-foreground">{formatRelativeTime(issue.lastSeenAt)}</span>
            </Link>
          ))
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            No workflow issues recorded yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatWorkflowLastCheck(value?: string): string {
  return value ? formatRelativeTime(value) : "Not run yet";
}

function formatFrequency(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes % 1440 === 0) {
    return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hr${minutes === 60 ? "" : "s"}`;
  }

  return `${minutes} min`;
}

function formatRunSummary(run: CheckRun): string {
  const source = (run.errorMessage ?? run.responseSummary).trim();

  if (!source) {
    return run.errorMessage ? "Request failed without a captured response." : "No response body captured.";
  }

  if (run.errorMessage) {
    return truncateSummary(source);
  }

  return summarizeResponseSummary(source);
}

function summarizeResponseSummary(summary: string): string {
  const parsed = parseJsonSummary(summary);

  if (Array.isArray(parsed)) {
    return parsed.length ? `JSON array response with ${parsed.length} items.` : "Empty JSON array response.";
  }

  if (parsed && typeof parsed === "object") {
    const values = Object.entries(parsed)
      .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
      .slice(0, 3)
      .map(([key, value]) => `${humanizeJsonKey(key)}: ${String(value)}`);

    return values.length ? values.join(" - ") : "JSON response received.";
  }

  if (/^\s*</.test(summary)) {
    return "HTML response received.";
  }

  return truncateSummary(summary);
}

function parseJsonSummary(summary: string): unknown {
  try {
    return JSON.parse(summary);
  } catch {
    return undefined;
  }
}

function humanizeJsonKey(key: string): string {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

function truncateSummary(summary: string): string {
  return summary.length > 160 ? `${summary.slice(0, 157)}...` : summary;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-3 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  defaultValue,
  min,
  max,
  maxLength,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
        max={max}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function HealthCheckFields({ configJson }: { configJson?: unknown }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Input
        label="Expected status"
        name="expectedStatus"
        placeholder="200"
        type="number"
        defaultValue={String(getStatusAssertionValue(configJson))}
        min={100}
        max={599}
        required
      />
      <Input
        label="Max latency ms"
        name="maxLatencyMs"
        placeholder="5000"
        type="number"
        defaultValue={String(getLatencyAssertionValue(configJson))}
        min={100}
        max={60000}
        required
      />
      <Input
        label="Timeout ms"
        name="timeoutMs"
        placeholder="10000"
        type="number"
        defaultValue={String(getTimeoutMs(configJson))}
        min={1000}
        max={60000}
        required
      />
      <CheckboxInput label="Require valid JSON" name="requireValidJson" defaultChecked={hasValidJsonAssertion(configJson)} />
      <TextArea
        className="md:col-span-2"
        label="Request body"
        name="requestBody"
        placeholder='{"ping":true}'
        defaultValue={getRequestBody(configJson)}
        maxLength={4000}
      />
      <Input
        label="Response contains"
        name="responseContains"
        placeholder="ok"
        defaultValue={getContainsTextAssertionValue(configJson)}
        maxLength={200}
      />
      <Input
        label="Required field"
        name="jsonFieldPath"
        placeholder="result.id"
        defaultValue={getFieldExistsAssertionValue(configJson)}
        maxLength={120}
      />
      <Input
        label="Required non-empty field"
        name="fieldNotEmptyPath"
        placeholder="result.answer"
        defaultValue={getFieldNotEmptyAssertionValue(configJson)}
        maxLength={120}
      />
      <Input
        label="Must not contain"
        name="notContainsValue"
        placeholder="error"
        defaultValue={getNotContainsAssertionValue(configJson)}
        maxLength={200}
      />
      <Input
        label="Must match regex"
        name="matchesRegexPattern"
        placeholder="case-[0-9]+"
        defaultValue={getMatchesRegexAssertionValue(configJson)}
        maxLength={500}
      />
    </div>
  );
}

function CheckboxInput({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
  className = "",
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  placeholder: string;
  className?: string;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      <textarea
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={3}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function getCheckConfig(value: unknown): { timeoutMs?: number; requestBody?: string; assertions?: Array<Record<string, unknown>> } {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as { timeoutMs?: number; requestBody?: string; assertions?: Array<Record<string, unknown>> }
    : {};
}

function getAssertions(value: unknown): Array<Record<string, unknown>> {
  const assertions = getCheckConfig(value).assertions;
  return Array.isArray(assertions)
    ? assertions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function getStatusAssertionValue(configJson?: unknown): number {
  const assertion = getAssertions(configJson).find((item) => item.type === "status_code");
  return typeof assertion?.expected === "number" ? assertion.expected : 200;
}

function getLatencyAssertionValue(configJson?: unknown): number {
  const assertion = getAssertions(configJson).find((item) => item.type === "latency_under");
  return typeof assertion?.maxMs === "number" ? assertion.maxMs : 5000;
}

function getTimeoutMs(configJson?: unknown): number {
  const timeoutMs = getCheckConfig(configJson).timeoutMs;
  return typeof timeoutMs === "number" ? timeoutMs : 10000;
}

function getRequestBody(configJson?: unknown): string {
  const requestBody = getCheckConfig(configJson).requestBody;
  return typeof requestBody === "string" ? requestBody : "";
}

function getFieldExistsAssertionValue(configJson?: unknown): string {
  const assertion = getAssertions(configJson).find((item) => item.type === "field_exists");
  return typeof assertion?.path === "string" ? assertion.path : "";
}

function getFieldNotEmptyAssertionValue(configJson?: unknown): string {
  const assertion = getAssertions(configJson).find((item) => item.type === "field_not_empty");
  return typeof assertion?.path === "string" ? assertion.path : "";
}

function getContainsTextAssertionValue(configJson?: unknown): string {
  const assertion = getAssertions(configJson).find((item) => item.type === "contains_text");
  return typeof assertion?.value === "string" ? assertion.value : "";
}

function getMatchesRegexAssertionValue(configJson?: unknown): string {
  const assertion = getAssertions(configJson).find((item) => item.type === "matches_regex");
  return typeof assertion?.pattern === "string" ? assertion.pattern : "";
}

function hasValidJsonAssertion(configJson?: unknown): boolean {
  return getAssertions(configJson).some((item) => item.type === "valid_json");
}

function getNotContainsAssertionValue(configJson?: unknown): string {
  const assertion = getAssertions(configJson).find((item) => item.type === "not_contains");
  return typeof assertion?.value === "string" ? assertion.value : "";
}
