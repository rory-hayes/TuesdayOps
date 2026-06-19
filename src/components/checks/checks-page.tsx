import type { ReactNode } from "react";
import Link from "next/link";
import { Beaker, Info, Plus, Play } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createCheckAction, disableCheckAction, runCheckAction, updateCheckAction } from "@/lib/checks/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
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

export function ChecksPage({
  data,
  notice,
  error,
}: {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
}) {
  const enabledChecks = data.checks.filter((check) => check.enabled);
  const enabledPacks = data.testPacks.filter((pack) => pack.enabled);

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
        <Badge variant="muted">{enabledChecks.length} enabled</Badge>
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
            <form action={createCheckAction} className="space-y-4">
              <BasicCheckSettings
                workflows={data.workflows}
                legendSuffix="for new health check"
                gridClassName="md:grid-cols-4"
                nameClassName="md:col-span-2"
              />
              <AdvancedCheckSettings gridClassName="md:grid-cols-4" />
              <FormSubmitButton type="submit" className="md:w-fit" pendingLabel="Adding...">
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
            {enabledChecks.length ? enabledChecks.map((check) => {
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
                  <details className="mt-4 rounded-lg bg-muted p-3 text-sm">
                    <summary className="cursor-pointer font-medium">Edit check settings</summary>
                    <form action={updateCheckAction} className="mt-3 space-y-3">
                      <input type="hidden" name="checkId" value={check.id} />
                      {workflow?.id ? <input type="hidden" name="workflowId" value={workflow.id} /> : null}
                      <BasicCheckSettings
                        legendSuffix={`for ${check.name}`}
                        gridClassName="md:grid-cols-2"
                        checkNameDefaultValue={check.name}
                        expectedStatusDefaultValue={getStatusAssertionValue(check.configJson)}
                        maxLatencyDefaultValue={getLatencyAssertionValue(check.configJson)}
                      />
                      <AdvancedCheckSettings configJson={check.configJson} gridClassName="md:grid-cols-2" />
                      <FormSubmitButton type="submit" size="sm" variant="secondary" className="md:w-fit" pendingLabel="Saving...">
                        Save check
                      </FormSubmitButton>
                    </form>
                  </details>
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

            {enabledPacks.length ? (
              enabledPacks.map((pack) => {
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
                    <form action={updateTestPackAction} className="mt-4 grid gap-3 rounded-lg bg-muted p-3 md:grid-cols-2">
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

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Cases</p>
                        <div className="mt-2 space-y-2">
                          {cases.length ? (
                            cases.map((testCase) => (
                              <details key={testCase.id} className="rounded-lg bg-muted px-3 py-2">
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

function BasicCheckSettings({
  workflows,
  legendSuffix,
  gridClassName,
  nameClassName = "",
  checkNameDefaultValue,
  expectedStatusDefaultValue,
  maxLatencyDefaultValue,
}: {
  workflows?: TuesdayOpsSeedData["workflows"];
  legendSuffix: string;
  gridClassName: string;
  nameClassName?: string;
  checkNameDefaultValue?: string;
  expectedStatusDefaultValue?: number;
  maxLatencyDefaultValue?: number;
}) {
  return (
    <fieldset aria-label={`Basic settings ${legendSuffix}`} className={`grid gap-3 ${gridClassName}`}>
      <legend className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        <span>Basic settings</span>
        <span className="sr-only"> {legendSuffix}</span>
      </legend>
      {workflows ? <WorkflowSelect workflows={workflows} /> : null}
      <Input
        className={nameClassName}
        label="Check name"
        name="name"
        placeholder="Endpoint health check"
        defaultValue={checkNameDefaultValue}
        required
        minLength={2}
        maxLength={120}
      />
      <Input
        label="Expected status"
        name="expectedStatus"
        placeholder="200"
        type="number"
        required
        min={100}
        max={599}
        defaultValue={expectedStatusDefaultValue}
      />
      <Input
        label="Max latency ms"
        name="maxLatencyMs"
        placeholder="5000"
        type="number"
        required
        min={100}
        max={60000}
        defaultValue={maxLatencyDefaultValue}
      />
    </fieldset>
  );
}

function WorkflowSelect({ workflows }: { workflows: TuesdayOpsSeedData["workflows"] }) {
  return (
    <label className="block text-sm font-medium md:col-span-2">
      Workflow
      <select
        required
        name="workflowId"
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      >
        {workflows.map((workflow) => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdvancedCheckSettings({
  configJson,
  gridClassName,
}: {
  configJson?: unknown;
  gridClassName: string;
}) {
  return (
    <details className="rounded-lg border border-border bg-muted/50 p-3">
      <summary className="cursor-pointer text-sm font-medium">Advanced settings</summary>
      <div className={`mt-3 grid gap-3 ${gridClassName}`}>
        <Input
          label="Timeout ms"
          name="timeoutMs"
          placeholder="10000"
          type="number"
          required
          min={1000}
          max={60000}
          defaultValue={getTimeoutMs(configJson)}
          helpText="Stop waiting after this many milliseconds."
        />
        <CheckboxInput
          label="Require valid JSON"
          name="requireValidJson"
          defaultChecked={hasValidJsonAssertion(configJson)}
          helpText="Fail the check when the response is not parseable JSON."
        />
        <TextArea
          className="md:col-span-2"
          label="Request body"
          name="requestBody"
          placeholder='{"ping":true}'
          defaultValue={getRequestBody(configJson)}
          maxLength={4000}
          helpText="Optional JSON payload for POST, PUT, or PATCH workflows."
        />
        <Input
          label="Response contains"
          name="responseContains"
          placeholder="ok"
          maxLength={200}
          defaultValue={getContainsTextAssertionValue(configJson)}
          helpText="Pass only when the response text includes this exact snippet."
        />
        <Input
          label="Required field"
          name="jsonFieldPath"
          placeholder="result.id"
          maxLength={120}
          defaultValue={getFieldExistsAssertionValue(configJson)}
          helpText="Use dot notation for JSON paths that must exist, such as result.id."
        />
        <Input
          label="Required non-empty field"
          name="fieldNotEmptyPath"
          placeholder="result.answer"
          maxLength={120}
          defaultValue={getFieldNotEmptyAssertionValue(configJson)}
          helpText="Use a JSON path that must exist and contain a non-empty value."
        />
        <Input
          label="Must match regex"
          name="matchesRegexPattern"
          placeholder="case-[0-9]+"
          maxLength={500}
          defaultValue={getMatchesRegexAssertionValue(configJson)}
          helpText="Validate response text with a regular expression pattern."
        />
        <Input
          label="Must not contain"
          name="notContainsValue"
          placeholder="error"
          maxLength={200}
          defaultValue={getNotContainsAssertionValue(configJson)}
          helpText="Negative assertion: fail when this text appears in the response."
        />
      </div>
    </details>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text",
  className = "",
  required = false,
  defaultValue,
  min,
  max,
  minLength,
  maxLength,
  helpText,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  className?: string;
  required?: boolean;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  helpText?: string;
}) {
  return (
    <div className={`block text-sm font-medium ${className}`}>
      <label className="block">
        <FieldLabel label={label} helpText={helpText} />
        <input
          required={required}
          name={name}
          type={type}
          defaultValue={defaultValue}
          min={min}
          max={max}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </label>
      <FieldHelp helpText={helpText} />
    </div>
  );
}

function CheckboxInput({
  label,
  name,
  defaultChecked = false,
  helpText,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  helpText?: string;
}) {
  return (
    <div>
      <label className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <FieldLabel label={label} helpText={helpText} />
      </label>
      <FieldHelp helpText={helpText} />
    </div>
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
  helpText,
}: {
  label: string;
  name: string;
  placeholder: string;
  className?: string;
  defaultValue?: string;
  maxLength?: number;
  validateJson?: boolean;
  helpText?: string;
}) {
  const TextAreaElement = validateJson ? JsonTextArea : "textarea";

  return (
    <div className={`block text-sm font-medium ${className}`}>
      <label className="block">
        <FieldLabel label={label} helpText={helpText} />
        <TextAreaElement
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          maxLength={maxLength}
          rows={3}
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <FieldHelp helpText={helpText} />
    </div>
  );
}

function FieldLabel({ label, helpText }: { label: string; helpText?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {helpText ? (
        <span title={helpText} aria-hidden="true" className="inline-flex text-muted-foreground">
          <Info size={13} />
        </span>
      ) : null}
    </span>
  );
}

function FieldHelp({ helpText }: { helpText?: ReactNode }) {
  return helpText ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{helpText}</p> : null;
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
