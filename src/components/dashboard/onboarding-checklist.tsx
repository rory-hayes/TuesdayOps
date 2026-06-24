"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  MonitorCheck,
  PlayCircle,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, ValidatedForm } from "@/components/ui/validated-form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { WorkflowImportForm } from "@/components/workflows/workflow-import-form";
import { buildOnboardingProgress, type OnboardingStepId } from "@/lib/onboarding/progress";
import {
  createActivationClientAction,
  createActivationWorkflowImportAction,
  createActivationWorkflowAction,
  generateActivationReportAction,
  runActivationCheckAction,
  type ActivationClientActionState,
  type ActivationReportActionState,
  type ActivationRunActionState,
  type ActivationWorkflowActionState,
} from "@/lib/onboarding/actions";
import type { Check, Client, ReportSummary, TuesdayOpsSeedData, Workflow as WorkflowRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type OnboardingChecklistProps = {
  data: TuesdayOpsSeedData;
};

type WizardStepId = OnboardingStepId;
type WorkflowMethod = "GET" | "POST" | "PUT" | "PATCH";
type WorkflowAuthType = "none" | "bearer" | "api_key_header" | "basic";

export function OnboardingChecklist({ data }: OnboardingChecklistProps) {
  const progress = buildOnboardingProgress(data);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState<WizardStepId>(progress.nextStep?.id ?? "client");
  const [clientState, clientAction] = useActionState(createActivationClientAction, null);
  const [workflowState, workflowAction] = useActionState(createActivationWorkflowAction, null);
  const [workflowImportState, workflowImportAction] = useActionState(createActivationWorkflowImportAction, null);
  const [runState, runAction] = useActionState(runActivationCheckAction, null);
  const [reportState, reportAction] = useActionState(generateActivationReportAction, null);
  const storageKey = `tuesdayops:activation-wizard-skipped:${data.agency.id}`;
  const context = useMemo(
    () => buildActivationContext({
      data,
      clientState,
      workflowState,
      workflowImportState,
      runState,
      reportState,
    }),
    [data, clientState, workflowState, workflowImportState, runState, reportState],
  );

  useEffect(() => {
    if (progress.complete) {
      return;
    }

    let skipped = false;

    try {
      skipped = window.localStorage.getItem(storageKey) === "true";
    } catch {
      skipped = false;
    }

    const openTimer = window.setTimeout(() => {
      setDismissed(skipped);

      if (!skipped) {
        setOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(openTimer);
  }, [progress.complete, storageKey]);

  useEffect(() => {
    if (clientState?.status === "success") {
      const stepTimer = window.setTimeout(() => setActiveStep("workflow"), 0);

      return () => window.clearTimeout(stepTimer);
    }
  }, [clientState]);

  useEffect(() => {
    if (workflowState?.status === "success" || workflowImportState?.status === "success") {
      const stepTimer = window.setTimeout(() => setActiveStep("check_run"), 0);

      return () => window.clearTimeout(stepTimer);
    }
  }, [workflowState, workflowImportState]);

  useEffect(() => {
    if (runState?.status === "success") {
      const stepTimer = window.setTimeout(() => setActiveStep("report"), 0);

      return () => window.clearTimeout(stepTimer);
    }
  }, [runState]);

  useEffect(() => {
    if (reportState?.status === "success") {
      try {
        window.localStorage.setItem(storageKey, "true");
      } catch {
        // The server-side report is already generated; persistence only controls the prompt.
      }
      const dismissTimer = window.setTimeout(() => setDismissed(true), 0);

      return () => window.clearTimeout(dismissTimer);
    }
  }, [reportState, storageKey]);

  if (progress.complete) {
    return null;
  }

  function skipWizard() {
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Dismissal persistence is a convenience; the modal still needs to close.
    }

    setDismissed(true);
    setOpen(false);
  }

  return (
    <>
      {!dismissed ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <ClipboardCheck aria-hidden="true" />
            Finish first setup
          </Button>
        </div>
      ) : null}

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-950/30" />
        <div className="fixed inset-0 flex w-screen items-start justify-center overflow-hidden px-4 py-4 sm:items-center sm:py-8">
          <DialogPanel className="grid h-[calc(100dvh-2rem)] w-full max-w-6xl grid-rows-[minmax(0,1fr)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-950/10 sm:h-[calc(100dvh-4rem)] sm:max-h-[900px] lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 border-r border-zinc-950/10 bg-zinc-50/80 p-6 lg:flex lg:flex-col">
              <div>
                <p className="text-sm/6 font-medium text-zinc-500">Activation path</p>
                <h2 className="mt-2 text-xl/7 font-semibold text-zinc-950">
                  Set up the first workflow proof
                </h2>
                <p className="mt-3 text-sm/6 text-zinc-500">
                  Create one client workflow, run a stored check, and generate a report draft.
                </p>
              </div>

              <ol className="mt-8 grid gap-2">
                {context.steps.map((step, index) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      className={cn(
                        "grid w-full grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-lg p-3 text-left transition-colors",
                        activeStep === step.id
                          ? "bg-white shadow-sm ring-1 ring-zinc-950/10"
                          : "hover:bg-white/70",
                      )}
                      onClick={() => setActiveStep(step.id)}
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full border text-xs font-semibold",
                          step.complete
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : activeStep === step.id
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-950/15 bg-white text-zinc-500",
                        )}
                      >
                        {step.complete ? <CheckCircle2 size={16} aria-hidden="true" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm/6 font-semibold text-zinc-950">{step.label}</span>
                        <span className="mt-0.5 block text-xs/5 text-zinc-500">{step.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="mt-auto rounded-lg border border-zinc-950/10 bg-white p-4 text-sm/6 text-zinc-500">
                <p className="font-medium text-zinc-950">{context.completedCount} of {context.steps.length} steps done</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-950 transition-all"
                    style={{ width: `${Math.round((context.completedCount / context.steps.length) * 100)}%` }}
                  />
                </div>
              </div>
            </aside>

            <section className="flex h-full min-h-0 flex-col overflow-hidden">
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-950/10 p-5 sm:p-6">
                <div>
                  <p className="text-sm/6 font-medium text-zinc-500">
                    Step {context.steps.findIndex((step) => step.id === activeStep) + 1} of {context.steps.length}
                  </p>
                  <DialogTitle className="mt-1 text-2xl/8 font-semibold text-zinc-950">
                    {getStepTitle(activeStep)}
                  </DialogTitle>
                  <p className="mt-2 max-w-2xl text-sm/6 text-zinc-500">
                    {getStepDescription(activeStep)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close activation path"
                  className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </header>

              <div
                role="region"
                aria-label="Activation wizard content"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6"
              >
                <div className="lg:hidden">
                  <MobileStepTabs
                    steps={context.steps}
                    activeStep={activeStep}
                    onSelect={setActiveStep}
                  />
                </div>
                <div className="mt-5 lg:mt-0">
                  <WizardStepPanel
                    activeStep={activeStep}
                    context={context}
                    clientAction={clientAction}
                    clientState={clientState}
                    workflowAction={workflowAction}
                    workflowState={workflowState}
                    workflowImportAction={workflowImportAction}
                    workflowImportState={workflowImportState}
                    runAction={runAction}
                    runState={runState}
                    reportAction={reportAction}
                    reportState={reportState}
                    onContinue={setActiveStep}
                    onClose={() => setOpen(false)}
                  />
                </div>
              </div>

              <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-zinc-950/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <button
                  type="button"
                  className="text-sm/6 font-medium text-zinc-500 transition hover:text-zinc-950"
                  onClick={skipWizard}
                >
                  Skip for now
                </button>
                <p className="text-xs/5 text-zinc-500">
                  You can still add clients, workflows, checks, and reports from the main navigation.
                </p>
              </footer>
            </section>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function WizardStepPanel({
  activeStep,
  context,
  clientAction,
  clientState,
  workflowAction,
  workflowState,
  workflowImportAction,
  workflowImportState,
  runAction,
  runState,
  reportAction,
  reportState,
  onContinue,
  onClose,
}: {
  activeStep: WizardStepId;
  context: ActivationContext;
  clientAction: (formData: FormData) => void;
  clientState: ActivationClientActionState;
  workflowAction: (formData: FormData) => void;
  workflowState: ActivationWorkflowActionState;
  workflowImportAction: (formData: FormData) => void;
  workflowImportState: ActivationWorkflowActionState;
  runAction: (formData: FormData) => void;
  runState: ActivationRunActionState;
  reportAction: (formData: FormData) => void;
  reportState: ActivationReportActionState;
  onContinue: (step: WizardStepId) => void;
  onClose: () => void;
}) {
  if (activeStep === "agency") {
    return (
      <ReadyPanel
        icon={<Building2 aria-hidden="true" />}
        title={`${context.agencyName} is ready`}
        description="Your agency workspace is already created, so the setup path can focus on the first client proof loop."
        action={<Button type="button" onClick={() => onContinue("client")}>Continue</Button>}
      />
    );
  }

  if (activeStep === "client") {
    if (context.client) {
      return (
        <ReadyPanel
          icon={<UserRound aria-hidden="true" />}
          title={`${context.client.name} is ready`}
          description="This client can now own the monitored workflow, issue history, and first report."
          action={<Button type="button" onClick={() => onContinue("workflow")}>Continue to workflow</Button>}
        />
      );
    }

    return <ClientStepForm action={clientAction} state={clientState} />;
  }

  if (activeStep === "workflow") {
    if (!context.client) {
      return (
        <BlockedPanel
          title="Create the client first"
          description="The first workflow needs a client owner before it can be monitored or included in reports."
          onClick={() => onContinue("client")}
        />
      );
    }

    if (context.workflow) {
      return (
        <ReadyPanel
          icon={<Workflow aria-hidden="true" />}
          title={`${context.workflow.name} is connected`}
          description={context.workflow.endpointUrl}
          action={<Button type="button" onClick={() => onContinue("check_run")}>Continue to first check</Button>}
        />
      );
    }

    return (
      <WorkflowStepForm
        client={context.client}
        action={workflowAction}
        state={workflowState}
        importAction={workflowImportAction}
        importState={workflowImportState}
      />
    );
  }

  if (activeStep === "check_run") {
    if (!context.check) {
      return (
        <BlockedPanel
          title="Create the health check first"
          description="Maintain Flow creates the first health check when you connect a workflow endpoint."
          onClick={() => onContinue("workflow")}
        />
      );
    }

    if (!context.check.enabled) {
      return (
        <BlockedPanel
          title="Add the production endpoint first"
          description="This import created a maintenance map, but the health check is disabled until a production webhook or heartbeat is configured."
          onClick={() => onContinue("workflow")}
        />
      );
    }

    if (context.hasCheckRun) {
      return (
        <ReadyPanel
          icon={<MonitorCheck aria-hidden="true" />}
          title="First check run is stored"
          description="Run history now has source data for workflow health, issues, and reports."
          action={<Button type="button" onClick={() => onContinue("report")}>Continue to report</Button>}
        />
      );
    }

    return (
      <RunCheckStepForm
        check={context.check}
        workflow={context.workflow}
        action={runAction}
        state={runState}
      />
    );
  }

  if (!context.client) {
    return (
      <BlockedPanel
        title="Create the client first"
        description="Reports are generated for a selected client and month."
        onClick={() => onContinue("client")}
      />
    );
  }

  if (context.report) {
    return (
      <ReadyPanel
        icon={<FileText aria-hidden="true" />}
        title="First report proof is ready"
        description="Open the preview for this draft, then manage future drafts from the Reports section."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/reports/${context.report.id}`}>Open report preview</LinkButton>
            <LinkButton href="/reports" variant="secondary">Go to Reports section</LinkButton>
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        }
      />
    );
  }

  return (
    <ReportStepForm
      client={context.client}
      action={reportAction}
      state={reportState}
    />
  );
}

function ClientStepForm({
  action,
  state,
}: {
  action: (formData: FormData) => void;
  state: ActivationClientActionState;
}) {
  return (
    <div className="max-w-2xl">
      <InlineActionState state={state} />
      <ValidatedForm action={action} aria-label="Activation client setup" className="mt-5 grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Client name" name="name" placeholder="Acme Support" required minLength={2} maxLength={100} />
          <Input label="Industry" name="industry" placeholder="B2B services" required minLength={2} maxLength={80} />
          <Input
            className="sm:col-span-2"
            label="Report email"
            name="reportRecipientEmail"
            type="email"
            placeholder="ops@client.example"
            required
          />
          <label className="block text-sm/6 font-medium text-zinc-950 sm:col-span-2">
            Notes
            <textarea
              name="notes"
              aria-label="Notes"
              rows={3}
              maxLength={1000}
              placeholder="What this retainer covers, important systems, or reporting notes"
              data-field-label="Notes"
              className="mt-2 w-full rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
            />
            <FieldError name="notes" />
          </label>
        </div>
        <div className="flex justify-end">
          <FormSubmitButton type="submit" pendingLabel="Creating client...">
            Create client
            <ArrowRight aria-hidden="true" />
          </FormSubmitButton>
        </div>
      </ValidatedForm>
    </div>
  );
}

function WorkflowStepForm({
  client,
  action,
  state,
  importAction,
  importState,
}: {
  client: ActivationClient;
  action: (formData: FormData) => void;
  state: ActivationWorkflowActionState;
  importAction: (formData: FormData) => void;
  importState: ActivationWorkflowActionState;
}) {
  const [setupMode, setSetupMode] = useState<"import" | "manual">("import");
  const [method, setMethod] = useState<WorkflowMethod>("GET");
  const [authType, setAuthType] = useState<WorkflowAuthType>("none");
  const showRequestBody = method !== "GET";
  const authSecretLabel =
    authType === "basic" ? "Password" : authType === "api_key_header" ? "API key" : "Bearer token";

  if (setupMode === "import") {
    return (
      <div className="max-w-5xl">
        <InlineActionState state={importState} />
        <div className="mt-5">
          <WorkflowImportForm
            clients={[client]}
            action={importAction}
            onManualSetup={() => setSetupMode("manual")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <InlineActionState state={state} />
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={() => setSetupMode("import")}>
          Back to import
        </Button>
      </div>
      <ValidatedForm action={action} aria-label="Activation workflow setup" className="mt-5 grid gap-5">
        <input type="hidden" name="clientId" value={client.id} />
        <section className="rounded-xl border border-zinc-950/10 p-4">
          <div className="flex items-center gap-2 text-sm/6 font-semibold text-zinc-950">
            <span className="grid size-6 place-items-center rounded-full bg-zinc-950 text-xs text-white">1</span>
            Workflow identity
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Workflow name" name="name" placeholder="e.g. client workflow endpoint" required minLength={2} maxLength={120} />
            <ReadOnlyField label="Client" value={client.name} />
            <Select label="Type" name="type" defaultValue="http_endpoint">
              <option value="http_endpoint">HTTP endpoint</option>
              <option value="webhook">Webhook</option>
              <option value="n8n">n8n</option>
              <option value="make">Make</option>
              <option value="zapier">Zapier</option>
              <option value="mcp_server">MCP server</option>
              <option value="custom_api">Custom API</option>
            </Select>
            <Select label="Environment" name="environment" defaultValue="production">
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </Select>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-950/10 p-4">
          <div className="flex items-center gap-2 text-sm/6 font-semibold text-zinc-950">
            <span className="grid size-6 place-items-center rounded-full bg-zinc-950 text-xs text-white">2</span>
            Endpoint and auth
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              className="md:col-span-2"
              label="Endpoint URL"
              name="endpointUrl"
              placeholder="https://example.com/api/health"
              type="url"
              required
            />
            <label className="block text-sm/6 font-medium text-zinc-950">
              Method
              <select
                name="method"
                aria-label="Method"
                value={method}
                onChange={(event) => setMethod(event.currentTarget.value as WorkflowMethod)}
                data-field-label="Method"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>
            <label className="block text-sm/6 font-medium text-zinc-950">
              Auth
              <select
                name="authType"
                aria-label="Auth"
                value={authType}
                onChange={(event) => setAuthType(event.currentTarget.value as WorkflowAuthType)}
                data-field-label="Auth"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="api_key_header">API key header</option>
                <option value="basic">Basic auth</option>
              </select>
            </label>
            {authType === "api_key_header" ? (
              <Input label="Auth header" name="authHeaderName" placeholder="x-api-key" required />
            ) : null}
            {authType === "basic" ? (
              <Input label="Basic username" name="basicUsername" placeholder="username" required />
            ) : null}
            {authType !== "none" ? (
              <Input label={authSecretLabel} name="authSecret" placeholder="Stored encrypted" type="password" required />
            ) : null}
            {showRequestBody ? (
              <label className="block text-sm/6 font-medium text-zinc-950 md:col-span-2">
                Request body
                <textarea
                  name="requestBody"
                  aria-label="Request body"
                  rows={4}
                  placeholder='{"ping": true}'
                  data-field-label="Request body"
                  className="mt-2 w-full rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
                />
                <FieldError name="requestBody" />
              </label>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-950/10 p-4">
          <div className="flex items-center gap-2 text-sm/6 font-semibold text-zinc-950">
            <span className="grid size-6 place-items-center rounded-full bg-zinc-950 text-xs text-white">3</span>
            First health check
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Input label="Frequency minutes" name="checkFrequencyMinutes" placeholder="60" type="number" defaultValue="60" required />
            <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" defaultValue="200" required />
            <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" defaultValue="5000" required />
            <Input label="Timeout ms" name="timeoutMs" placeholder="10000" type="number" defaultValue="10000" required />
            <Input
              className="md:col-span-2"
              label="Response contains"
              name="responseContains"
              placeholder="ok"
            />
            <Input
              className="md:col-span-2"
              label="JSON field exists"
              name="jsonFieldPath"
              placeholder="data.status"
            />
            <Input
              className="md:col-span-2"
              label="Field not empty"
              name="fieldNotEmptyPath"
              placeholder="data.id"
            />
            <label className="flex items-center gap-2 self-end rounded-lg border border-zinc-950/10 px-3 py-2 text-sm/6 font-medium text-zinc-950 md:col-span-2">
              <input
                type="checkbox"
                name="requireValidJson"
                className="size-4 rounded border-zinc-950/20 text-zinc-950 focus:ring-zinc-950/20"
              />
              Require valid JSON response
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs/5 text-zinc-500">
            Auth secrets are encrypted and never displayed again after save.
          </p>
          <FormSubmitButton type="submit" pendingLabel="Creating workflow...">
            Create workflow and check
            <ArrowRight aria-hidden="true" />
          </FormSubmitButton>
        </div>
      </ValidatedForm>
    </div>
  );
}

function RunCheckStepForm({
  check,
  workflow,
  action,
  state,
}: {
  check: ActivationCheck;
  workflow?: ActivationWorkflow;
  action: (formData: FormData) => void;
  state: ActivationRunActionState;
}) {
  return (
    <div className="max-w-2xl">
      <InlineActionState state={state} />
      <div className="mt-5 rounded-xl border border-zinc-950/10 p-5">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
            <PlayCircle size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base/7 font-semibold text-zinc-950">Run the first health check</h3>
            <p className="mt-1 text-sm/6 text-zinc-500">
              Maintain Flow will call the configured endpoint, store the result, update workflow health, and create an issue if the run fails or degrades.
            </p>
            {workflow ? (
              <p className="mt-3 break-all rounded-lg bg-zinc-50 p-3 font-mono text-xs/5 text-zinc-600 ring-1 ring-zinc-950/5">
                {workflow.endpointUrl}
              </p>
            ) : null}
          </div>
        </div>
        <form action={action} className="mt-5 flex justify-end">
          <input type="hidden" name="checkId" value={check.id} />
          <FormSubmitButton type="submit" pendingLabel="Running check...">
            Run first check
          </FormSubmitButton>
        </form>
      </div>
    </div>
  );
}

function ReportStepForm({
  client,
  action,
  state,
}: {
  client: ActivationClient;
  action: (formData: FormData) => void;
  state: ActivationReportActionState;
}) {
  const currentPeriod = new Date().toISOString().slice(0, 7);

  if (state?.status === "success") {
    return (
      <ReadyPanel
        icon={<FileText aria-hidden="true" />}
        title="Report generated"
        description={`${state.message} Manage future drafts from the Reports section.`}
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/reports/${state.reportId}`}>Open report preview</LinkButton>
            <LinkButton href="/reports" variant="secondary">Go to Reports section</LinkButton>
          </div>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl">
      <InlineActionState state={state} />
      <div className="mt-5 rounded-xl border border-zinc-950/10 p-5">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
            <FileText size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base/7 font-semibold text-zinc-950">Generate the first client report</h3>
            <p className="mt-1 text-sm/6 text-zinc-500">
              The report will use stored workflow, check, issue, and QA data for {client.name}.
            </p>
          </div>
        </div>
        <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="block text-sm/6 font-medium text-zinc-950">
            Report period
            <input
              required
              type="month"
              name="period"
              defaultValue={currentPeriod}
              aria-label="Report period"
              data-field-label="Report period"
              className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
            />
          </label>
          <FormSubmitButton type="submit" pendingLabel="Generating...">
            Generate report
          </FormSubmitButton>
        </form>
      </div>
    </div>
  );
}

function ReadyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl rounded-xl border border-emerald-600/20 bg-emerald-50/70 p-5">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white [&>svg]:size-5">
          {icon}
        </span>
        <div>
          <h3 className="text-base/7 font-semibold text-zinc-950">{title}</h3>
          <p className="mt-1 text-sm/6 text-zinc-600">{description}</p>
          <div className="mt-5">{action}</div>
        </div>
      </div>
    </div>
  );
}

function BlockedPanel({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div className="max-w-2xl rounded-xl border border-amber-500/25 bg-amber-50 p-5">
      <h3 className="text-base/7 font-semibold text-zinc-950">{title}</h3>
      <p className="mt-1 text-sm/6 text-zinc-600">{description}</p>
      <Button type="button" className="mt-5" onClick={onClick}>
        Go to required step
      </Button>
    </div>
  );
}

function MobileStepTabs({
  steps,
  activeStep,
  onSelect,
}: {
  steps: ActivationStep[];
  activeStep: WizardStepId;
  onSelect: (step: WizardStepId) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm/6 font-medium",
            activeStep === step.id
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-zinc-950/10 bg-white text-zinc-700",
          )}
          onClick={() => onSelect(step.id)}
        >
          {step.complete ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
          {index + 1}. {step.shortLabel}
        </button>
      ))}
    </div>
  );
}

function InlineActionState({
  state,
}: {
  state:
    | ActivationClientActionState
    | ActivationWorkflowActionState
    | ActivationRunActionState
    | ActivationReportActionState;
}) {
  if (!state) {
    return null;
  }

  const success = state.status === "success";

  return (
    <p
      role={success ? "status" : "alert"}
      className={cn(
        "rounded-lg px-3 py-2 text-sm/6",
        success
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
          : "bg-red-50 text-red-700 ring-1 ring-red-600/20",
      )}
    >
      {state.message}
    </p>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  minLength,
  maxLength,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm/6 font-medium text-zinc-950", className)}>
      {label}
      <input
        required={required}
        name={name}
        aria-label={label}
        type={type}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        data-field-label={label}
        className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      />
      <FieldError name={name} />
    </label>
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
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm/6 font-medium text-zinc-950">
      {label}
      <select
        name={name}
        aria-label={label}
        defaultValue={defaultValue}
        data-field-label={label}
        className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      >
        {children}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block text-sm/6 font-medium text-zinc-950">
      {label}
      <div className="mt-2 flex h-10 items-center rounded-lg border border-zinc-950/10 bg-zinc-50 px-3 text-sm/6 font-normal text-zinc-600">
        {value}
      </div>
    </div>
  );
}

function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm/6 font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
        variant === "primary"
          ? "border-transparent bg-primary text-primary-foreground hover:bg-zinc-800"
          : "border-zinc-950/10 bg-white text-zinc-950 hover:bg-zinc-50",
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function buildActivationContext({
  data,
  clientState,
  workflowState,
  workflowImportState,
  runState,
  reportState,
}: {
  data: TuesdayOpsSeedData;
  clientState: ActivationClientActionState;
  workflowState: ActivationWorkflowActionState;
  workflowImportState: ActivationWorkflowActionState;
  runState: ActivationRunActionState;
  reportState: ActivationReportActionState;
}): ActivationContext {
  const existingClient = data.clients.find((client) => !client.archived);
  const client = existingClient
    ? toActivationClient(existingClient)
    : clientState?.status === "success"
      ? { id: clientState.clientId, name: clientState.clientName }
      : undefined;
  const existingWorkflow = data.workflows.find((workflow) => workflow.clientId === client?.id) ?? data.workflows[0];
  const createdWorkflowState = workflowState?.status === "success"
    ? workflowState
    : workflowImportState?.status === "success"
      ? workflowImportState
      : null;
  const workflow = existingWorkflow
    ? toActivationWorkflow(existingWorkflow)
    : createdWorkflowState
      ? {
          id: createdWorkflowState.workflowId,
          name: createdWorkflowState.workflowName,
          endpointUrl: "Endpoint saved. Refresh to view details.",
        }
      : undefined;
  const existingCheck = data.checks.find((check) => check.workflowId === workflow?.id && check.type === "health")
    ?? data.checks.find((check) => check.type === "health")
    ?? data.checks[0];
  const check = existingCheck
    ? toActivationCheck(existingCheck)
    : createdWorkflowState
      ? { id: createdWorkflowState.checkId, name: "Endpoint health check", enabled: createdWorkflowState.checkEnabled ?? true }
      : undefined;
  const hasCheckRun = data.checkRuns.length > 0 || runState?.status === "success";
  const existingReport = data.reports.find((report) => report.clientId === client?.id) ?? data.reports[0];
  const report = existingReport
    ? toActivationReport(existingReport)
    : reportState?.status === "success"
      ? { id: reportState.reportId, periodLabel: "Generated report" }
      : undefined;
  const steps: ActivationStep[] = [
    {
      id: "agency",
      label: "Create agency",
      shortLabel: "Agency",
      detail: data.agency.name,
      complete: true,
    },
    {
      id: "client",
      label: "Add first client",
      shortLabel: "Client",
      detail: client?.name ?? "Client owner for the first workflow",
      complete: Boolean(client),
    },
    {
      id: "workflow",
      label: "Add first workflow",
      shortLabel: "Workflow",
      detail: workflow?.name ?? "Endpoint, method, auth, and assertions",
      complete: Boolean(workflow),
    },
    {
      id: "check_run",
      label: "Run first check",
      shortLabel: "Check",
      detail: hasCheckRun ? "Run history is being stored" : "Store the first endpoint result",
      complete: hasCheckRun,
    },
    {
      id: "report",
      label: "Create first report",
      shortLabel: "Report",
      detail: report?.periodLabel ?? "Generate client-facing proof",
      complete: Boolean(report),
    },
  ];

  return {
    agencyName: data.agency.name,
    client,
    workflow,
    check,
    hasCheckRun,
    report,
    steps,
    completedCount: steps.filter((step) => step.complete).length,
  };
}

function toActivationClient(client: Client): ActivationClient {
  return {
    id: client.id,
    name: client.name,
  };
}

function toActivationWorkflow(workflow: WorkflowRecord): ActivationWorkflow {
  return {
    id: workflow.id,
    name: workflow.name,
    endpointUrl: workflow.endpointUrl,
  };
}

function toActivationCheck(check: Check): ActivationCheck {
  return {
    id: check.id,
    name: check.name,
    enabled: check.enabled,
  };
}

function toActivationReport(report: ReportSummary): ActivationReport {
  return {
    id: report.id,
    periodLabel: report.periodLabel,
  };
}

function getStepTitle(step: WizardStepId): string {
  const titles: Record<WizardStepId, string> = {
    agency: "Confirm the agency workspace",
    client: "Add the client",
    workflow: "Import the first workflow",
    check_run: "Run the first health check",
    report: "Generate the first report",
  };

  return titles[step];
}

function getStepDescription(step: WizardStepId): string {
  const descriptions: Record<WizardStepId, string> = {
    agency: "The workspace anchors every client, workflow, check, issue, and report.",
    client: "Start with one retained client so monitoring data has the right owner.",
    workflow: "Choose n8n, Make, Zapier, API, or manual setup and create the first maintenance map.",
    check_run: "Send a safe request, store the result, and let Maintain Flow update health and issues.",
    report: "Create a client-facing proof draft from the real source data collected so far.",
  };

  return descriptions[step];
}

type ActivationContext = {
  agencyName: string;
  client?: ActivationClient;
  workflow?: ActivationWorkflow;
  check?: ActivationCheck;
  hasCheckRun: boolean;
  report?: ActivationReport;
  steps: ActivationStep[];
  completedCount: number;
};

type ActivationStep = {
  id: WizardStepId;
  label: string;
  shortLabel: string;
  detail: string;
  complete: boolean;
};

type ActivationClient = {
  id: string;
  name: string;
};

type ActivationWorkflow = {
  id: string;
  name: string;
  endpointUrl: string;
};

type ActivationCheck = {
  id: string;
  name: string;
  enabled: boolean;
};

type ActivationReport = {
  id: string;
  periodLabel: string;
};
