"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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

export function AddWorkflowDialog({
  clients,
  createWorkflowAction,
  createWorkflowFromImportAction,
}: AddWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SetupMode>("import");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  function openDialog() {
    setMode("import");
    setOpen(true);
  }

  return (
    <>
      <Button type="button" size="sm" onClick={openDialog}>
        <Plus size={15} aria-hidden="true" />
        Add workflow
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/20 px-4 py-6 backdrop-blur-sm md:py-10"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close add workflow"
            tabIndex={-1}
            className="fixed inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-workflow-title"
            aria-describedby="add-workflow-description"
            ref={dialogRef}
            className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="text-sm font-medium text-primary">Workflow onboarding</p>
                <h2 id="add-workflow-title" className="mt-1 text-xl font-semibold">
                  Add workflow
                </h2>
                <p
                  id="add-workflow-description"
                  className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                >
                  Import an existing endpoint or configure one manually, then TuesdayOps creates the first health check.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add workflow"
                ref={closeButtonRef}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="grid gap-4 border-b border-border p-5 md:grid-cols-3">
              <JourneyStep label="1. Capture" detail="Choose import or manual setup." />
              <JourneyStep label="2. Confirm check" detail="Set method, auth, frequency, and thresholds." />
              <JourneyStep label="3. Create & test" detail="Save the workflow, then run its first check." />
            </div>

            <div className="flex flex-wrap gap-2 border-b border-border p-5">
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

            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-5">
              {mode === "import" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Quick workflow import</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Paste a URL, cURL command, OpenAPI JSON, or Postman collection and review the generated monitor before saving.
                    </p>
                  </div>
                  <WorkflowImportForm clients={clients} action={createWorkflowFromImportAction} />
                </div>
              ) : (
                <ManualWorkflowForm clients={clients} action={createWorkflowAction} />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function JourneyStep({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 size={15} className="text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
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
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted"
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
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Add an active client before registering a workflow endpoint.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Manual endpoint setup</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Register a live client endpoint and create its first health check.
        </p>
      </div>
      <form action={action} className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm font-medium">
          Client
          <select
            required
            name="clientId"
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
            defaultValue="production"
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
