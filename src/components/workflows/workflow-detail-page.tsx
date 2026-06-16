import Link from "next/link";
import { ArrowLeft, LockKeyhole, Play, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { MiniLineChart } from "@/components/charts/simple-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { RunLogKeyPanel } from "@/components/workflows/run-log-key-panel";
import { createCheckAction, runCheckAction } from "@/lib/checks/service";
import type { TuesdayOpsSeedData, Workflow } from "@/lib/domain/types";
import { archiveWorkflowAction, updateWorkflowAction } from "@/lib/workflows/service";
import { formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";
import { buildChangeComparison } from "@/lib/reports/change-comparison";
import { buildPassRateTrend } from "@/lib/dashboard/charts";

export function WorkflowDetailPage({
  data,
  workflow,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  workflow: Workflow;
  notice?: string;
  error?: string;
}) {
  const client = data.clients.find((candidate) => candidate.id === workflow.clientId);
  const checks = data.checks.filter((check) => check.workflowId === workflow.id);
  const runs = data.checkRuns.filter((run) => run.workflowId === workflow.id);
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
          <h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">{workflow.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {client?.name ?? "Unknown client"} endpoint health, assertions, and manual run history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
        <Stat label="Last check" value={formatRelativeTime(workflow.lastCheckAt)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MiniLineChart label="Workflow pass-rate trend" points={buildPassRateTrend(runs)} suffix="%" />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Endpoint</h2>
              <p className="mt-1 text-sm text-muted-foreground">Stored workflow connection metadata.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Info label="Client" value={client?.name ?? "Unknown"} />
              <Info label="URL" value={workflow.endpointUrl} />
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Method" value={workflow.method} />
                <Info label="Environment" value={workflow.environment} />
                <Info label="Type" value={workflow.type.replaceAll("_", " ")} />
                <Info label="Frequency" value={`${workflow.checkFrequencyMinutes} minutes`} />
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <LockKeyhole size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                Workflow auth config is encrypted at rest and never displayed in the UI.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Workflow settings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update endpoint metadata and report inclusion.
              </p>
            </CardHeader>
            <CardContent>
              <form action={updateWorkflowAction} className="grid gap-3">
                <input type="hidden" name="id" value={workflow.id} />
                <Input label="Name" name="name" placeholder="Workflow name" defaultValue={workflow.name} required />
                <Input label="Endpoint URL" name="endpointUrl" placeholder="https://example.com/api/health" type="url" defaultValue={workflow.endpointUrl} required />
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

          <RunLogKeyPanel workflowId={workflow.id} activeKeys={activeRunLogKeys} />

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Change validation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lightweight model/prompt comparisons from logged runs.
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
                      {group.runs} runs · {group.averageLatencyMs}ms average latency
                      {group.averageCostEstimate === undefined ? "" : ` · ${group.averageCostEstimate} average cost`}
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

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Add check</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create another lightweight assertion pack.</p>
            </CardHeader>
            <CardContent>
              <form action={createCheckAction} className="grid gap-3">
                <input type="hidden" name="workflowId" value={workflow.id} />
                <Input label="Name" name="name" placeholder="Endpoint responds with 200" required />
                <div className="grid gap-3 md:grid-cols-3">
                  <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required />
                  <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" required />
                  <Input label="Timeout ms" name="timeoutMs" placeholder="10000" type="number" required />
                </div>
                <FormSubmitButton type="submit" className="w-fit" pendingLabel="Adding...">
                  <Plus size={15} aria-hidden="true" />
                  Add check
                </FormSubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
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
                          <FormSubmitButton type="submit" size="sm" pendingLabel="Running...">
                            <Play size={14} aria-hidden="true" />
                            Run
                          </FormSubmitButton>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  No checks are attached to this workflow yet.
                </p>
              )}
            </CardContent>
          </Card>

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
                        <td className="max-w-80 truncate px-5 py-4 text-muted-foreground">
                          {run.errorMessage ?? run.responseSummary}
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
        </div>
      </section>
    </div>
  );
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
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
