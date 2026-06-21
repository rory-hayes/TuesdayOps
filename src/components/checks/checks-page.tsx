import Link from "next/link";
import { AlertTriangle, Beaker, CheckCircle2, ClipboardCheck, Plus, Play, Settings2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { PageFeedback } from "@/components/ui/page-feedback";
import { FieldError, ValidatedForm } from "@/components/ui/validated-form";
import { createCheckAction, disableCheckAction, runCheckAction, updateCheckAction } from "@/lib/checks/service";
import type { TestCase, TestRun, TuesdayOpsSeedData } from "@/lib/domain/types";
import {
  createTestCaseAction,
  createTestPackAction,
  archiveTestCaseAction,
  disableTestPackAction,
  runTestPackAction,
  updateTestCaseAction,
  updateTestPackAction,
} from "@/lib/test-packs/service";
import { formatDateTime, formatPercentage, formatRelativeTime } from "@/lib/formatting";
import {
  buildChecksPageModel,
  type CheckCoverageRow,
  type ChecksAttentionItem,
  type ChecksMetric,
  type TestPackCoverageRow,
} from "@/components/checks/checks-page-model";

export function ChecksPage({
  data,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
}) {
  const model = buildChecksPageModel(data);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Quality checks</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            Check coverage
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            See which client workflows are being checked, what needs attention, and what QA evidence is ready for reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{model.enabledChecks.length} health checks</Badge>
          <Badge variant="muted">{model.enabledPacks.length} test packs</Badge>
        </div>
      </section>

      <PageFeedback notice={notice} error={error} />

      <MetricsGrid metrics={model.metrics} />
      <AttentionPanel items={model.attentionItems} />
      <CoverageSetupPanel data={data} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
        <EnabledChecksPanel checks={model.enabledChecks} />
        <TestPacksPanel packs={model.enabledPacks} />
      </section>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: ChecksMetric[] }) {
  return (
    <section aria-label="QA coverage summary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="border-t border-zinc-950/10 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <MetricToneIcon tone={metric.tone} />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-normal">{metric.value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.detail}</p>
        </div>
      ))}
    </section>
  );
}

function MetricToneIcon({ tone }: { tone?: ChecksMetric["tone"] }) {
  if (tone === "success") {
    return <CheckCircle2 size={15} className="text-lime-700" aria-hidden="true" />;
  }

  if (tone === "warning") {
    return <AlertTriangle size={15} className="text-amber-700" aria-hidden="true" />;
  }

  if (tone === "danger") {
    return <AlertTriangle size={15} className="text-red-700" aria-hidden="true" />;
  }

  return null;
}

function AttentionPanel({ items }: { items: ChecksAttentionItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Needs attention</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Coverage gaps and failed QA signals that could weaken client reporting.
          </p>
        </div>
        <Badge variant={items.length ? "danger" : "success"}>
          {items.length ? `${items.length} to review` : "clear"}
        </Badge>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={item.href ?? "/checks"}
                className="rounded-lg border border-zinc-950/10 bg-white p-4 transition-colors hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge variant={item.tone}>{item.tone === "danger" ? "urgent" : "review"}</Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg bg-muted p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">Coverage is in good shape</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Active workflows have QA coverage and no failed check signals need review.
              </p>
            </div>
            <CheckCircle2 size={20} className="text-lime-700" aria-hidden="true" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoverageSetupPanel({ data }: { data: TuesdayOpsSeedData }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Add QA coverage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create checks only when you need to expand coverage; day-to-day review happens below.
          </p>
        </div>
        <ClipboardCheck size={18} className="text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {data.workflows.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <details className="rounded-lg border border-border bg-muted/40 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                <span>Add health check</span>
                <Plus size={15} aria-hidden="true" />
              </summary>
              <ValidatedForm action={createCheckAction} aria-label="Add health check" className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium md:col-span-2">
                  Workflow
                  <select
                    required
                    name="workflowId"
                    aria-label="Workflow"
                    data-field-label="Workflow"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {data.workflows.map((workflow) => (
                      <option key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </option>
                    ))}
                  </select>
                  <FieldError name="workflowId" />
                </label>
                <Input label="Check name" name="name" placeholder="Endpoint health check" required minLength={2} maxLength={120} />
                <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required min={100} max={599} />
                <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" required min={100} max={60000} />
                <AdvancedHealthCheckFields className="md:col-span-2" />
                <FormSubmitButton type="submit" className="md:col-span-2 md:w-fit" pendingLabel="Adding...">
                  <Plus size={15} aria-hidden="true" />
                  Add check
                </FormSubmitButton>
              </ValidatedForm>
            </details>

            <details className="rounded-lg border border-border bg-muted/40 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                <span>Add test pack</span>
                <Beaker size={15} aria-hidden="true" />
              </summary>
              <form action={createTestPackAction} className="mt-4 grid gap-3 md:grid-cols-2">
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
            </details>
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Register a workflow before adding health checks or test packs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EnabledChecksPanel({ checks }: { checks: CheckCoverageRow[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">Health checks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scheduled endpoint monitors and their latest stored health signal.
        </p>
      </CardHeader>
      <CardContent>
        {checks.length ? (
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.id} className="rounded-lg border border-border p-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{check.name}</p>
                      <StatusBadge status={check.latestStatus} />
                    </div>
                    <Link href={check.workflowHref} className="mt-1 block text-sm text-primary">
                      {check.workflowName}
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="muted">{check.type}</Badge>
                      <Badge variant="muted">{check.schedule}</Badge>
                      <Badge variant="muted">{check.assertionCount} assertions</Badge>
                      <Badge variant="muted">
                        {check.lastRunAt ? `last run ${formatRelativeTime(check.lastRunAt)}` : "never run"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <form action={runCheckAction}>
                      <input type="hidden" name="checkId" value={check.id} />
                      <FormSubmitButton type="submit" size="sm" pendingLabel="Running...">
                        <Play size={14} aria-hidden="true" />
                        Run
                      </FormSubmitButton>
                    </form>
                    <form action={disableCheckAction}>
                      <input type="hidden" name="checkId" value={check.id} />
                      <FormSubmitButton
                        type="submit"
                        size="sm"
                        variant="secondary"
                        pendingLabel="Disabling..."
                        confirmMessage="Disable this check? Historical check runs will be preserved."
                      >
                        Disable
                      </FormSubmitButton>
                    </form>
                  </div>
                </div>

                <details className="mt-4 rounded-lg bg-muted p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                    <Settings2 size={14} aria-hidden="true" />
                    Edit check settings
                  </summary>
                  <form action={updateCheckAction} className="mt-3 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="checkId" value={check.id} />
                    <input type="hidden" name="workflowId" value={check.workflowId} />
                    <Input label="Check name" name="name" placeholder="Endpoint health check" defaultValue={check.name} required minLength={2} maxLength={120} />
                    <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required min={100} max={599} defaultValue={getStatusAssertionValue(check.configJson)} />
                    <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" required min={100} max={60000} defaultValue={getLatencyAssertionValue(check.configJson)} />
                    <AdvancedHealthCheckFields
                      className="md:col-span-2"
                      defaultValues={{
                        timeoutMs: getTimeoutMs(check.configJson),
                        requireValidJson: hasValidJsonAssertion(check.configJson),
                        requestBody: getRequestBody(check.configJson),
                        responseContains: getContainsTextAssertionValue(check.configJson),
                        jsonFieldPath: getFieldExistsAssertionValue(check.configJson),
                        fieldNotEmptyPath: getFieldNotEmptyAssertionValue(check.configJson),
                        matchesRegexPattern: getMatchesRegexAssertionValue(check.configJson),
                        notContainsValue: getNotContainsAssertionValue(check.configJson),
                      }}
                    />
                    <FormSubmitButton type="submit" size="sm" variant="secondary" className="md:col-span-2 md:w-fit" pendingLabel="Saving...">
                      Save check
                    </FormSubmitButton>
                  </form>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            No endpoint checks have been created yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TestPacksPanel({ packs }: { packs: TestPackCoverageRow[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Synthetic test packs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Regression cases that prove workflow behavior before it reaches the report.
          </p>
        </div>
        <Beaker size={18} className="text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-3">
        {packs.length ? (
          packs.map((pack) => (
            <div key={pack.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium">{pack.name}</p>
                  <Link href={pack.workflowHref} className="mt-1 block text-sm text-primary">
                    {pack.workflowName}
                  </Link>
                  {pack.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{pack.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getPackPassRateVariant(pack)}>
                    {pack.recentRuns.length ? formatPercentage(pack.passRate) : "not run"}
                  </Badge>
                  <Badge variant="muted">{pack.caseCount} cases</Badge>
                  <form action={runTestPackAction}>
                    <input type="hidden" name="testPackId" value={pack.id} />
                    <FormSubmitButton type="submit" size="sm" disabled={!pack.cases.length} pendingLabel="Running...">
                      <Play size={14} aria-hidden="true" />
                      Run pack
                    </FormSubmitButton>
                  </form>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="muted">
                  {pack.recentRuns.length ? `last run ${formatRelativeTime(pack.lastRunAt)}` : "never run"}
                </Badge>
                <Badge variant="muted">{pack.recentRuns.length} recent results</Badge>
              </div>

              <details className="mt-4 rounded-lg bg-muted p-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                  <Settings2 size={14} aria-hidden="true" />
                  Configure pack, cases, and recent runs
                </summary>
                <PackConfiguration pack={pack} />
              </details>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
            Create a test pack to start storing synthetic workflow cases.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PackConfiguration({ pack }: { pack: TestPackCoverageRow }) {
  return (
    <div className="mt-4 grid gap-4">
      <form action={updateTestPackAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="testPackId" value={pack.id} />
        <Input label="Pack name" name="name" placeholder="Regression pack" defaultValue={pack.name} required minLength={2} maxLength={120} />
        <TextArea
          label="Description"
          name="description"
          placeholder="Core happy-path and guardrail checks"
          defaultValue={pack.description}
          maxLength={400}
        />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Saving...">
            Save pack
          </FormSubmitButton>
          <FormSubmitButton
            formAction={disableTestPackAction}
            type="submit"
            size="sm"
            variant="secondary"
            pendingLabel="Disabling..."
            confirmMessage="Disable this test pack? Historical synthetic runs will be preserved."
          >
            Disable pack
          </FormSubmitButton>
        </div>
      </form>

      <details className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Add case</summary>
        <form action={createTestCaseAction} className="mt-3 grid gap-3 md:grid-cols-2">
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
          <CheckboxInput label="Require valid JSON" name="requireValidJson" />
          <Input label="Required field" name="fieldExistsPath" placeholder="result.id" maxLength={120} />
          <Input label="Required non-empty field" name="fieldNotEmptyPath" placeholder="result.answer" maxLength={120} />
          <Input label="Must contain text" name="containsTextValue" placeholder="approved" maxLength={240} />
          <Input label="Must match regex" name="matchesRegexPattern" placeholder="case-[0-9]+" maxLength={500} />
          <Input label="Must not contain" name="notContainsValue" placeholder="error" maxLength={120} />
          <FormSubmitButton type="submit" size="sm" className="md:col-span-2 md:w-fit" pendingLabel="Adding...">
            <Plus size={14} aria-hidden="true" />
            Add case
          </FormSubmitButton>
        </form>
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <TestCaseList cases={pack.cases} />
        <RecentTestRuns runs={pack.recentRuns} cases={pack.cases} />
      </div>
    </div>
  );
}

function TestCaseList({ cases }: { cases: TestCase[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">Cases</p>
      <div className="mt-2 space-y-2">
        {cases.length ? (
          cases.map((testCase) => (
            <details key={testCase.id} className="rounded-lg bg-background px-3 py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium">{testCase.name}</span>
                <StatusBadge status={testCase.latestStatus} />
              </summary>
              <form action={updateTestCaseAction} className="mt-3 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="testCaseId" value={testCase.id} />
                <Input label="Case name" name="name" placeholder="Happy path lead intake" defaultValue={testCase.name} required minLength={2} maxLength={120} />
                <TextArea
                  label="Input JSON"
                  name="inputJson"
                  placeholder='{"leadId":"qa-001","intent":"book"}'
                  defaultValue={formatJsonValue(testCase.inputJson)}
                  validateJson
                />
                <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required min={100} max={599} defaultValue={getStatusAssertionValue(testCase.assertionsJson)} />
                <Input label="Max latency ms" name="maxLatencyMs" placeholder="10000" type="number" required min={100} max={60000} defaultValue={getLatencyAssertionValue(testCase.assertionsJson)} />
                <CheckboxInput label="Require valid JSON" name="requireValidJson" defaultChecked={hasValidJsonAssertion(testCase.assertionsJson)} />
                <Input label="Required field" name="fieldExistsPath" placeholder="result.id" maxLength={120} defaultValue={getFieldExistsAssertionValue(testCase.assertionsJson)} />
                <Input label="Required non-empty field" name="fieldNotEmptyPath" placeholder="result.answer" maxLength={120} defaultValue={getFieldNotEmptyAssertionValue(testCase.assertionsJson)} />
                <Input label="Must contain text" name="containsTextValue" placeholder="approved" maxLength={240} defaultValue={getContainsTextAssertionValue(testCase.assertionsJson)} />
                <Input label="Must match regex" name="matchesRegexPattern" placeholder="case-[0-9]+" maxLength={500} defaultValue={getMatchesRegexAssertionValue(testCase.assertionsJson)} />
                <Input label="Must not contain" name="notContainsValue" placeholder="error" maxLength={120} defaultValue={getNotContainsAssertionValue(testCase.assertionsJson)} />
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <FormSubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Saving...">
                    Save case
                  </FormSubmitButton>
                  <FormSubmitButton
                    formAction={archiveTestCaseAction}
                    type="submit"
                    size="sm"
                    variant="secondary"
                    pendingLabel="Archiving..."
                    confirmMessage="Archive this test case? Historical synthetic runs will be preserved."
                  >
                    Archive case
                  </FormSubmitButton>
                </div>
              </form>
            </details>
          ))
        ) : (
          <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
            Add the first test case before running this pack.
          </p>
        )}
      </div>
    </div>
  );
}

function RecentTestRuns({ runs, cases }: { runs: TestRun[]; cases: TestCase[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">Recent runs</p>
      <div className="mt-2 space-y-2">
        {runs.length ? (
          runs.map((run) => {
            const testCase = cases.find((candidate) => candidate.id === run.testCaseId);

            return (
              <div key={run.id} className="rounded-lg bg-background px-3 py-2">
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
          <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
            No synthetic runs recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}

function getPackPassRateVariant(pack: TestPackCoverageRow): "success" | "warning" | "danger" | "muted" {
  if (!pack.recentRuns.length) {
    return "muted";
  }

  if (pack.passRate >= 90) {
    return "success";
  }

  return pack.passRate >= 70 ? "warning" : "danger";
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
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
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
        aria-label={label}
        type={type}
        defaultValue={defaultValue}
        min={min}
        max={max}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        data-field-label={label}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
      <FieldError name={name} />
    </label>
  );
}

type AdvancedHealthCheckFieldValues = {
  timeoutMs?: number;
  requireValidJson?: boolean;
  requestBody?: string;
  responseContains?: string;
  jsonFieldPath?: string;
  fieldNotEmptyPath?: string;
  matchesRegexPattern?: string;
  notContainsValue?: string;
};

function AdvancedHealthCheckFields({
  className = "",
  defaultValues = {},
}: {
  className?: string;
  defaultValues?: AdvancedHealthCheckFieldValues;
}) {
  return (
    <details className={`rounded-lg border border-border bg-muted/40 p-3 ${className}`}>
      <summary className="cursor-pointer text-sm font-medium">Advanced request and assertions</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Input
          label="Timeout ms"
          name="timeoutMs"
          placeholder="10000"
          type="number"
          required
          min={1000}
          max={60000}
          defaultValue={defaultValues.timeoutMs ?? 10000}
        />
        <CheckboxInput
          label="Require valid JSON"
          name="requireValidJson"
          defaultChecked={defaultValues.requireValidJson}
        />
        <TextArea
          className="md:col-span-2"
          label="Request body"
          name="requestBody"
          placeholder='e.g. {"ping":true}'
          defaultValue={defaultValues.requestBody}
          maxLength={4000}
        />
        <Input
          label="Response contains"
          name="responseContains"
          placeholder="e.g. ok"
          maxLength={200}
          defaultValue={defaultValues.responseContains}
        />
        <Input
          label="Required field"
          name="jsonFieldPath"
          placeholder="e.g. result.id"
          maxLength={120}
          defaultValue={defaultValues.jsonFieldPath}
        />
        <Input
          label="Required non-empty field"
          name="fieldNotEmptyPath"
          placeholder="e.g. result.answer"
          maxLength={120}
          defaultValue={defaultValues.fieldNotEmptyPath}
        />
        <Input
          label="Must match regex"
          name="matchesRegexPattern"
          placeholder="e.g. case-[0-9]+"
          maxLength={500}
          defaultValue={defaultValues.matchesRegexPattern}
        />
        <Input
          label="Must not contain"
          name="notContainsValue"
          placeholder="e.g. error"
          maxLength={200}
          defaultValue={defaultValues.notContainsValue}
        />
      </div>
    </details>
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
  validateJson = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  className?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={3}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function formatJsonValue(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function getStatusAssertionValue(assertionsJson: unknown): number {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "status_code");
  return typeof assertion?.expected === "number" ? assertion.expected : 200;
}

function getLatencyAssertionValue(assertionsJson: unknown): number {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "latency_under");
  return typeof assertion?.maxMs === "number" ? assertion.maxMs : 10000;
}

function getTimeoutMs(configJson: unknown): number {
  const config = getCheckConfig(configJson);
  return typeof config.timeoutMs === "number" ? config.timeoutMs : 10000;
}

function getRequestBody(configJson: unknown): string {
  const config = getCheckConfig(configJson);
  return typeof config.requestBody === "string" ? config.requestBody : "";
}

function getFieldExistsAssertionValue(assertionsJson: unknown): string {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "field_exists");
  return typeof assertion?.path === "string" ? assertion.path : "";
}

function getFieldNotEmptyAssertionValue(assertionsJson: unknown): string {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "field_not_empty");
  return typeof assertion?.path === "string" ? assertion.path : "";
}

function getContainsTextAssertionValue(assertionsJson: unknown): string {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "contains_text");
  return typeof assertion?.value === "string" ? assertion.value : "";
}

function getMatchesRegexAssertionValue(assertionsJson: unknown): string {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "matches_regex");
  return typeof assertion?.pattern === "string" ? assertion.pattern : "";
}

function hasValidJsonAssertion(assertionsJson: unknown): boolean {
  return getAssertions(assertionsJson).some((item) => item.type === "valid_json");
}

function getNotContainsAssertionValue(assertionsJson: unknown): string {
  const assertion = getAssertions(assertionsJson).find((item) => item.type === "not_contains");
  return typeof assertion?.value === "string" ? assertion.value : "";
}

function getAssertions(value: unknown): Array<Record<string, unknown>> {
  const source = Array.isArray(value)
    ? value
    : getCheckConfig(value).assertions;

  return Array.isArray(source)
    ? source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function getCheckConfig(value: unknown): { timeoutMs?: number; requestBody?: string; assertions?: unknown[] } {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as { timeoutMs?: number; requestBody?: string; assertions?: unknown[] }
    : {};
}
