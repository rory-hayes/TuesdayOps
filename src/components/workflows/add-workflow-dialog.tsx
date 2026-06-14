"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CheckCircle2, Plus, Upload, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowImportForm } from "@/components/workflows/workflow-import-form";

type ClientOption = {
  id: string;
  name: string;
};

type AddWorkflowDialogProps = {
  clients: ClientOption[];
  createWorkflowAction: (formData: FormData) => void | Promise<void>;
  createWorkflowFromImportAction: (formData: FormData) => void | Promise<void>;
};

type SetupMode = "import" | "manual";

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
        <div className="fixed inset-0 flex w-screen items-start justify-center overflow-y-auto px-4 py-8 sm:py-12">
          <DialogPanel className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-950/10">
            <header className="flex items-start justify-between gap-4 border-b border-zinc-950/10 p-6">
              <div>
                <p className="text-sm/6 font-medium text-zinc-500">Workflow onboarding</p>
                <DialogTitle id="add-workflow-title" className="mt-1 text-xl/7 font-semibold text-zinc-950">
                  Add workflow
                </DialogTitle>
                <p
                  id="add-workflow-description"
                  className="mt-2 max-w-2xl text-sm/6 text-zinc-500"
                >
                  Import an existing endpoint or configure one manually, then TuesdayOps creates the first health check.
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

            <div className="grid gap-4 border-b border-zinc-950/10 p-6 md:grid-cols-3">
              <JourneyStep label="1. Capture" detail="Choose import or manual setup." />
              <JourneyStep label="2. Confirm check" detail="Set method, auth, frequency, and thresholds." />
              <JourneyStep label="3. Create & test" detail="Save the workflow, then run its first check." />
            </div>

            <div className="flex flex-wrap gap-2 border-b border-zinc-950/10 p-6">
              <ModeButton
                active={mode === "import"}
                icon={<Upload size={15} aria-hidden="true" />}
                label="Quick import"
                onClick={() => setMode("import")}
              />
              <ModeButton
                active={mode === "manual"}
                icon={<Wrench size={15} aria-hidden="true" />}
                label="Manual setup"
                onClick={() => setMode("manual")}
              />
            </div>

            <div className="max-h-[calc(100vh-19rem)] overflow-y-auto p-6">
              {mode === "import" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base/7 font-semibold text-zinc-950">Quick workflow import</h3>
                    <p className="mt-1 text-sm/6 text-zinc-500">
                      Paste a URL, cURL command, OpenAPI JSON, or Postman collection and review the generated monitor before saving.
                    </p>
                  </div>
                  <WorkflowImportForm clients={clients} action={createWorkflowFromImportAction} />
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

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-950/10 bg-white text-zinc-700 hover:bg-zinc-950/5"
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function ManualWorkflowForm({
  clients,
  action,
}: {
  clients: ClientOption[];
  action: (formData: FormData) => void | Promise<void>;
}) {
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
      <form action={action} className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm font-medium">
          Client
          <select
            required
            name="clientId"
            className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Workflow name" name="name" placeholder="Lead Intake Webhook" required />
        <label className="block text-sm font-medium">
          Type
          <select
            name="type"
            defaultValue="http_endpoint"
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
            defaultValue="production"
            className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </label>
        <Input
          className="md:col-span-2"
          label="Endpoint URL"
          name="endpointUrl"
          placeholder="https://example.com/api/health"
          type="url"
          required
        />
        <label className="block text-sm font-medium">
          Method
          <select
            name="method"
            defaultValue="GET"
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
            defaultValue="none"
            className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="none">None</option>
            <option value="bearer">Bearer token</option>
            <option value="api_key_header">API key header</option>
            <option value="basic">Basic auth</option>
          </select>
        </label>
        <Input label="Auth header" name="authHeaderName" placeholder="x-api-key" />
        <Input label="Basic username" name="basicUsername" placeholder="username" />
        <Input label="Auth secret" name="authSecret" placeholder="Stored encrypted" type="password" />
        <Input label="Frequency minutes" name="checkFrequencyMinutes" placeholder="60" type="number" required />
        <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required />
        <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" required />
        <label className="block text-sm font-medium md:col-span-4">
          Request body
          <textarea
            name="requestBody"
            placeholder='{"ping": true}'
            rows={4}
            className="mt-2 w-full rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          />
        </label>
        <Button type="submit" className="md:col-span-4 md:w-fit">
          <Plus size={15} aria-hidden="true" />
          Create workflow
        </Button>
      </form>
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
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      <input
        required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 outline-none focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}
