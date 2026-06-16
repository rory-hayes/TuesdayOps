import Link from "next/link";
import { Beaker, Plus, Play } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createCheckAction, runCheckAction } from "@/lib/checks/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import {
  createTestCaseAction,
  createTestPackAction,
  runTestPackAction,
} from "@/lib/test-packs/service";
import { formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function ChecksPage({
  data,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Checks</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            Health checks and synthetic test packs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Lightweight QA checks that catch broken endpoints, schema drift, latency spikes, and unsafe output.
          </p>
        </div>
        <Badge variant="muted">{data.checks.length} enabled</Badge>
      </section>

      <PageFeedback notice={notice} error={error} />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Create health check</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Attach a lightweight HTTP assertion pack to a registered workflow.
          </p>
        </CardHeader>
        <CardContent>
          {data.workflows.length ? (
            <form action={createCheckAction} className="grid gap-3 md:grid-cols-5">
              <label className="block text-sm font-medium md:col-span-2">
                Workflow
                <select
                  required
                  name="workflowId"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {data.workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Check name" name="name" placeholder="Endpoint health check" required minLength={2} maxLength={120} />
              <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required min={100} max={599} />
              <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" required min={100} max={60000} />
              <Input label="Timeout ms" name="timeoutMs" placeholder="10000" type="number" required min={1000} max={60000} />
              <FormSubmitButton type="submit" className="md:col-span-5 md:w-fit" pendingLabel="Adding...">
                <Plus size={15} aria-hidden="true" />
                Add check
              </FormSubmitButton>
            </form>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Register a workflow before adding health checks.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Enabled checks</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scheduled monitors attached to workflows.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.checks.length ? data.checks.map((check) => {
              const workflow = data.workflows.find((candidate) => candidate.id === check.workflowId);

              return (
                <div key={check.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <Link href={`/workflows/${workflow?.id}`} className="mt-1 block text-sm text-primary">
                        {workflow?.name}
                      </Link>
                    </div>
                    <StatusBadge status={check.latestStatus} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="muted">{check.type}</Badge>
                    <Badge variant="muted">{check.schedule}</Badge>
                    <Badge variant="muted">{check.assertionCount} assertions</Badge>
                    <form action={runCheckAction}>
                      <input type="hidden" name="checkId" value={check.id} />
                      <FormSubmitButton type="submit" size="sm" pendingLabel="Running...">
                        <Play size={14} aria-hidden="true" />
                        Run
                      </FormSubmitButton>
                    </form>
                  </div>
                </div>
              );
            }) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                No endpoint checks have been created yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Synthetic test packs</h2>
              <p className="mt-1 text-sm text-muted-foreground">Regression cases for workflow behavior.</p>
            </div>
            <Beaker size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            {data.workflows.length ? (
              <form action={createTestPackAction} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Workflow
                  <select
                    required
                    name="workflowId"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {data.workflows.map((workflow) => (
                      <option key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Input label="Pack name" name="name" placeholder="Regression pack" required minLength={2} maxLength={120} />
                <TextArea
                  className="md:col-span-2"
                  label="Description"
                  name="description"
                  placeholder="Core happy-path and guardrail checks"
                  maxLength={400}
                />
                <FormSubmitButton type="submit" className="md:col-span-2 md:w-fit" pendingLabel="Adding...">
                  <Plus size={15} aria-hidden="true" />
                  Add test pack
                </FormSubmitButton>
              </form>
            ) : null}

            {data.testPacks.length ? (
              data.testPacks.map((pack) => {
                const workflow = data.workflows.find((candidate) => candidate.id === pack.workflowId);
                const cases = data.testCases.filter((testCase) => testCase.testPackId === pack.id);
                const runs = data.testRuns.filter((run) => run.testPackId === pack.id);

                return (
                  <div key={pack.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium">{pack.name}</p>
                        <Link href={`/workflows/${workflow?.id}`} className="mt-1 block text-sm text-primary">
                          {workflow?.name}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={runs.length ? (pack.passRate >= 90 ? "success" : "warning") : "muted"}>
                          {runs.length ? formatPercentage(pack.passRate) : "not run"}
                        </Badge>
                        <form action={runTestPackAction}>
                          <input type="hidden" name="testPackId" value={pack.id} />
                          <FormSubmitButton type="submit" size="sm" disabled={!cases.length} pendingLabel="Running...">
                            <Play size={14} aria-hidden="true" />
                            Run pack
                          </FormSubmitButton>
                        </form>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{pack.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="muted">{pack.caseCount} cases</Badge>
                      <Badge variant="muted">
                        {runs.length ? `last run ${formatRelativeTime(pack.lastRunAt)}` : "never run"}
                      </Badge>
                    </div>

                    <form action={createTestCaseAction} className="mt-4 grid gap-3 rounded-lg bg-muted p-3 md:grid-cols-2">
                      <input type="hidden" name="testPackId" value={pack.id} />
                      <Input label="Case name" name="name" placeholder="Happy path lead intake" required minLength={2} maxLength={120} />
                      <TextArea
                        label="Input JSON"
                        name="inputJson"
                        placeholder='{"leadId":"qa-001","intent":"book"}'
                        validateJson
                      />
                      <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required min={100} max={599} />
                      <Input label="Max latency ms" name="maxLatencyMs" placeholder="10000" type="number" required min={100} max={60000} />
                      <Input label="Required field" name="fieldExistsPath" placeholder="result.id" maxLength={120} />
                      <Input label="Must not contain" name="notContainsValue" placeholder="error" maxLength={120} />
                      <FormSubmitButton type="submit" size="sm" className="md:col-span-2 md:w-fit" pendingLabel="Adding...">
                        <Plus size={14} aria-hidden="true" />
                        Add case
                      </FormSubmitButton>
                    </form>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Cases</p>
                        <div className="mt-2 space-y-2">
                          {cases.length ? (
                            cases.map((testCase) => (
                              <div key={testCase.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                                <p className="min-w-0 truncate text-sm font-medium">{testCase.name}</p>
                                <StatusBadge status={testCase.latestStatus} />
                              </div>
                            ))
                          ) : (
                            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                              Add the first test case before running this pack.
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Recent runs</p>
                        <div className="mt-2 space-y-2">
                          {runs.length ? (
                            runs.slice(0, 3).map((run) => {
                              const testCase = cases.find((candidate) => candidate.id === run.testCaseId);

                              return (
                                <div key={run.id} className="rounded-lg bg-muted px-3 py-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="min-w-0 truncate text-sm font-medium">
                                      {testCase?.name ?? "Test case"}
                                    </p>
                                    <StatusBadge status={run.status} />
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {run.statusCode ?? "-"} / {run.latencyMs} ms / {formatDateTime(run.createdAt)}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                              No synthetic runs recorded yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Create a test pack to start storing synthetic workflow cases.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  min,
  max,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        min={min}
        max={max}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
  className = "",
  maxLength,
  validateJson = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  className?: string;
  maxLength?: number;
  validateJson?: boolean;
}) {
  const TextAreaElement = validateJson ? JsonTextArea : "textarea";

  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      <TextAreaElement
        name={name}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
