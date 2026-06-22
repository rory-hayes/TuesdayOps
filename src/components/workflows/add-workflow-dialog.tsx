"use client";

import { useActionState, useId, useState, useSyncExternalStore } from "react";
import type { ChangeEventHandler, KeyboardEvent } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { FieldError, ValidatedForm } from "@/components/ui/validated-form";
import { WorkflowImportForm } from "@/components/workflows/workflow-import-form";
import {
  getHealthCheckThresholdMessage,
  healthCheckThresholds,
  type HealthCheckThresholdField,
} from "@/lib/checks/thresholds";
import type { WorkflowCreateActionState } from "@/lib/workflows/validation";

type ClientOption = {
  id: string;
  name: string;
};

type AddWorkflowDialogProps = {
  clients: ClientOption[];
  createWorkflowAction: (
    previousState: WorkflowCreateActionState,
    formData: FormData,
  ) => Promise<WorkflowCreateActionState>;
  createWorkflowFromImportAction: (formData: FormData) => void | Promise<void>;
};

type SetupMode = "import" | "manual";
type WorkflowMethod = "GET" | "POST" | "PUT" | "PATCH";
type WorkflowAuthType = "none" | "bearer" | "api_key_header" | "basic";

const subscribeHydration = () => () => {};
const clientHydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

export function AddWorkflowDialog({
  clients,
  createWorkflowAction,
  createWorkflowFromImportAction,
}: AddWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SetupMode>("import");
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientHydratedSnapshot,
    serverHydratedSnapshot,
  );

  function openDialog() {
    setMode("import");
    setOpen(true);
  }

  return (
    <>
      <Button type="button" size="sm" disabled={!ready} onClick={openDialog}>
        <Plus size={15} aria-hidden="true" />
        Add workflow
      </Button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-950/25" />
        <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto px-4 py-4 sm:py-8">
          <DialogPanel className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-950/10">
            <header className="flex items-start justify-between gap-4 border-b border-zinc-950/10 p-5 sm:p-6">
              <div>
                <p className="text-sm/6 font-medium text-zinc-500">Workflow onboarding</p>
                <DialogTitle id="add-workflow-title" className="mt-1 text-xl/7 font-semibold text-zinc-950">
                  Add workflow
                </DialogTitle>
                <p
                  id="add-workflow-description"
                  className="mt-2 max-w-2xl text-sm/6 text-zinc-500"
                >
                  Import an existing endpoint or configure one manually, then Maintain Flow creates the first health check.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add workflow"
                className="grid size-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="grid gap-3 border-b border-zinc-950/10 p-4 md:grid-cols-3">
              <JourneyStep label="1. Capture" detail="Choose import or manual setup." />
              <JourneyStep label="2. Confirm check" detail="Set method, auth, frequency, and thresholds." />
              <JourneyStep label="3. Create & test" detail="Save the workflow, then run its first check." />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              {mode === "import" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base/7 font-semibold text-zinc-950">Import workflow</h3>
                    <p className="mt-1 text-sm/6 text-zinc-500">
                      Choose the automation platform, paste the export, and review the maintenance map before saving.
                    </p>
                  </div>
                  <WorkflowImportForm
                    clients={clients}
                    action={createWorkflowFromImportAction}
                    onManualSetup={() => setMode("manual")}
                  />
                </div>
              ) : (
                <ManualWorkflowForm clients={clients} action={createWorkflowAction} />
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function JourneyStep({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-950/5">
      <div className="flex items-center gap-2 text-sm/6 font-medium text-zinc-950">
        <CheckCircle2 size={15} className="text-lime-700" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-xs/5 text-zinc-500">{detail}</p>
    </div>
  );
}

function ManualWorkflowForm({
  clients,
  action,
}: {
  clients: ClientOption[];
  action: (
    previousState: WorkflowCreateActionState,
    formData: FormData,
  ) => Promise<WorkflowCreateActionState>;
}) {
  const [method, setMethod] = useState<WorkflowMethod>("GET");
  const [authType, setAuthType] = useState<WorkflowAuthType>("none");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [state, formAction] = useActionState(action, null);
  const showRequestBody = method !== "GET";
  const authSecretLabel =
    authType === "basic" ? "Password" : authType === "api_key_header" ? "API key" : "Bearer token";
  const serverErrors = state?.status === "error" ? state.fieldErrors : undefined;

  if (!clients.length) {
    return (
      <p className="rounded-lg bg-zinc-50 p-3 text-sm/6 text-zinc-500 ring-1 ring-zinc-950/5">
        Add an active client before registering a workflow endpoint.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base/7 font-semibold text-zinc-950">Manual endpoint setup</h3>
        <p className="mt-1 text-sm/6 text-zinc-500">
          Register a live client endpoint and create its first health check.
        </p>
      </div>
      <PageFeedback
        variant="inline"
        error={state?.status === "error" ? state.message : undefined}
      />
      <ValidatedForm
        action={formAction}
        aria-label="Manual workflow setup"
        className="grid gap-5"
        serverErrors={serverErrors}
      >
        <section className="rounded-lg border border-zinc-950/10 p-4">
          <div className="flex items-center gap-2 text-sm/6 font-semibold text-zinc-950">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs text-primary">1</span>
            Identify the workflow
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Client
              <select
                required
                name="clientId"
                aria-label="Client"
                data-field-label="Client"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <FieldError name="clientId" />
            </label>
            <Input label="Workflow name" name="name" placeholder="e.g. Lead Intake Webhook" required />
            <label className="block text-sm font-medium">
              Type
              <select
                name="type"
                aria-label="Type"
                defaultValue="http_endpoint"
                data-field-label="Type"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
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
                aria-label="Environment"
                defaultValue="production"
                data-field-label="Environment"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-950/10 p-4">
          <div className="flex items-center gap-2 text-sm/6 font-semibold text-zinc-950">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs text-primary">2</span>
            Connect the endpoint
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              className="md:col-span-2"
              label="Endpoint URL"
              name="endpointUrl"
              placeholder="e.g. https://example.com/api/health"
              type="url"
              value={endpointUrl}
              onChange={(event) => setEndpointUrl(event.currentTarget.value)}
              required
            />
            <label className="block text-sm font-medium">
              Method
              <select
                name="method"
                aria-label="Method"
                value={method}
                onChange={(event) => setMethod(event.currentTarget.value as WorkflowMethod)}
                data-field-label="Method"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Auth
              <select
                name="authType"
                aria-label="Auth"
                value={authType}
                onChange={(event) => setAuthType(event.currentTarget.value as WorkflowAuthType)}
                data-field-label="Auth"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="api_key_header">API key header</option>
                <option value="basic">Basic auth</option>
              </select>
            </label>
            {authType === "api_key_header" ? (
              <Input label="Auth header" name="authHeaderName" placeholder="e.g. x-api-key" required />
            ) : null}
            {authType === "basic" ? (
              <Input label="Basic username" name="basicUsername" placeholder="e.g. workflow-user" required />
            ) : null}
            {authType !== "none" ? (
              <Input label={authSecretLabel} name="authSecret" placeholder="Paste secret once" type="password" required />
            ) : null}
            {showRequestBody ? (
              <label className="block text-sm font-medium md:col-span-2">
                Request body
                <textarea
                  name="requestBody"
                  aria-label="Request body"
                  placeholder='e.g. {"ping": true}'
                  rows={4}
                  data-field-label="Request body"
                  className="mt-2 w-full rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
                />
                <FieldError name="requestBody" />
              </label>
            ) : null}
          </div>
        </section>

        <section className="mb-16 rounded-lg border border-zinc-950/10 p-4">
          <div className="flex items-center gap-2 text-sm/6 font-semibold text-zinc-950">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs text-primary">3</span>
            Set the first health check
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <ThresholdInput
              field="checkFrequencyMinutes"
              label="Frequency minutes"
              name="checkFrequencyMinutes"
              placeholder="60"
              defaultValue="60"
            />
            <ThresholdInput
              field="expectedStatus"
              label="Expected status"
              name="expectedStatus"
              placeholder="200"
              defaultValue="200"
            />
            <ThresholdInput
              field="maxLatencyMs"
              label="Max latency ms"
              name="maxLatencyMs"
              placeholder="5000"
              defaultValue="5000"
            />
            <ThresholdInput
              field="timeoutMs"
              label="Timeout ms"
              name="timeoutMs"
              placeholder="10000"
              defaultValue="10000"
            />
            <Input
              className="md:col-span-2"
              label="Response contains"
              name="responseContains"
              placeholder="e.g. ok"
            />
            <Input
              className="md:col-span-2"
              label="JSON field exists"
              name="jsonFieldPath"
              placeholder="e.g. data.status"
            />
          </div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-zinc-950/10 bg-white/95 px-6 py-4 backdrop-blur">
          <p className="hidden text-xs leading-5 text-zinc-500 sm:block">
            Auth secrets are encrypted on save and are never displayed back to users.
          </p>
          <FormSubmitButton type="submit" className="w-full sm:w-fit" pendingLabel="Creating...">
            <Plus size={15} aria-hidden="true" />
            Create workflow
          </FormSubmitButton>
        </div>
      </ValidatedForm>
    </div>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  className = "",
  defaultValue,
  value,
  onChange,
  min,
  max,
  minMessage,
  maxMessage,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  min?: number;
  max?: number;
  minMessage?: string;
  maxMessage?: string;
}) {
  const inputId = useId();

  return (
    <div className={`block text-sm font-medium ${className}`}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        required={required}
        name={name}
        aria-label={label}
        type={type}
        {...(value === undefined ? { defaultValue } : { value, onChange })}
        min={min}
        max={max}
        placeholder={placeholder}
        data-field-label={label}
        data-min-message={minMessage}
        data-max-message={maxMessage}
        onKeyDown={handleInputKeyDown}
        className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      />
      <FieldError name={name} />
    </div>
  );
}

function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (!isSelectAllShortcut(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.select();
}

function isSelectAllShortcut(event: KeyboardEvent<HTMLInputElement>) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "a";
}

function ThresholdInput({
  field,
  label,
  name,
  placeholder,
  defaultValue,
}: {
  field: HealthCheckThresholdField;
  label: string;
  name: string;
  placeholder: string;
  defaultValue: string;
}) {
  const bounds = healthCheckThresholds[field];
  const message = getHealthCheckThresholdMessage(field);

  return (
    <Input
      label={label}
      name={name}
      placeholder={placeholder}
      type="number"
      defaultValue={defaultValue}
      min={bounds.min}
      max={bounds.max}
      minMessage={message}
      maxMessage={message}
      required
    />
  );
}
