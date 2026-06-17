"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, LockKeyhole, Plus, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { WorkflowType } from "@/lib/domain/types";
import {
  WORKFLOW_ONBOARDING_TEMPLATES,
  maskWorkflowImportSecrets,
  parseWorkflowImport,
  type WorkflowImportPlan,
  type WorkflowImportSource,
} from "@/lib/workflows/onboarding";

type ClientOption = {
  id: string;
  name: string;
};

type WorkflowImportFormProps = {
  clients: ClientOption[];
  action: (formData: FormData) => void | Promise<void>;
};

type ImportPreviewState =
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; plan: WorkflowImportPlan };

const importSources: Array<{
  value: WorkflowImportSource;
  label: string;
  placeholder: string;
}> = [
  {
    value: "url",
    label: "URL",
    placeholder: "https://api.example.com/health",
  },
  {
    value: "curl",
    label: "cURL",
    placeholder:
      'curl -X POST "https://hooks.example.com/lead" -H "Authorization: Bearer ..." -d \'{"ping":true}\'',
  },
  {
    value: "openapi",
    label: "OpenAPI JSON/YAML/URL",
    placeholder: 'https://docs.example.com/openapi.json or {"openapi":"3.1.0","servers":[...]}',
  },
  {
    value: "postman",
    label: "Postman JSON",
    placeholder: '{"info":{"name":"Client workflow"},"item":[{"request":{...}}]}',
  },
];

export function WorkflowImportForm({ clients, action }: WorkflowImportFormProps) {
  const sourceRef = useRef<HTMLSelectElement>(null);
  const [importSource, setImportSource] = useState<WorkflowImportSource>("url");
  const [importText, setImportText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [workflowTypeOverride, setWorkflowTypeOverride] = useState<WorkflowType | undefined>();
  const [showRawImportText, setShowRawImportText] = useState(false);
  const syncFormState = useCallback((sourceOverride?: WorkflowImportSource) => {
    setImportSource(sourceOverride ?? readImportSource(sourceRef.current?.value));
  }, []);

  const selectedSource = importSources.find((source) => source.value === importSource) ?? importSources[0];
  const selectedTemplate = WORKFLOW_ONBOARDING_TEMPLATES.find((template) => template.type === workflowTypeOverride);
  const maskedImportText = maskWorkflowImportSecrets(importText);
  const importSecretsHidden = Boolean(importText) && maskedImportText !== importText && !showRawImportText;
  const visibleImportText = importSecretsHidden ? maskedImportText : importText;
  const preview = useMemo<ImportPreviewState>(() => {
    if (!importText.trim()) {
      return { status: "empty" };
    }

    try {
      if (importSource === "openapi" && /^https?:\/\//i.test(importText.trim())) {
        return {
          status: "ready",
          plan: {
            name: "OpenAPI URL import",
            type: "custom_api",
            endpointUrl: importText.trim(),
            method: "GET",
            authType: "none",
            checkFrequencyMinutes: 60,
            expectedStatus: 200,
            maxLatencyMs: 5000,
          },
        };
      }

      return {
        status: "ready",
        plan: parseWorkflowImport({
          source: importSource,
          text: importText,
        }),
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Workflow import could not be parsed.",
      };
    }
  }, [importSource, importText]);
  const canSubmit = clients.length > 0 && preview.status === "ready";

  if (!clients.length) {
    return (
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Add an active client before importing a workflow endpoint.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">Optional starting point</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {WORKFLOW_ONBOARDING_TEMPLATES.map((template) => (
            <button
              key={template.type}
              type="button"
              aria-pressed={workflowTypeOverride === template.type}
              className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors focus:border-primary focus:outline-none ${
                workflowTypeOverride === template.type
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted"
              }`}
              onClick={() => {
                const nextSource = template.defaultMethod === "POST" ? "curl" : "url";

                if (sourceRef.current) {
                  sourceRef.current.value = nextSource;
                }

                setWorkflowTypeOverride(template.type);
                syncFormState(nextSource);
              }}
            >
              <p className="whitespace-nowrap text-sm font-medium">{template.label}</p>
            </button>
          ))}
        </div>
      </div>

      <form action={action} className="grid gap-4">
        {workflowTypeOverride ? <input type="hidden" name="workflowType" value={workflowTypeOverride} /> : null}
        <div className="grid gap-4 pb-16 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block text-sm font-medium">
              Import client
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
            <label className="block text-sm font-medium">
              Import source
              <select
                required
                name="importSource"
                ref={sourceRef}
                defaultValue="url"
                onChange={() => syncFormState()}
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {importSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Display name
              <input
                name="importedWorkflowName"
                value={displayName}
                onChange={(event) => setDisplayName(event.currentTarget.value)}
                maxLength={120}
                placeholder="Lead Intake Webhook"
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block text-sm font-medium md:col-span-4">
              Import details
              <textarea
                required
                minLength={8}
                name="importText"
                value={visibleImportText}
                readOnly={importSecretsHidden}
                onChange={(event) => {
                  setImportText(event.currentTarget.value);
                  setShowRawImportText(false);
                }}
                placeholder={selectedSource.placeholder}
                rows={5}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input type="hidden" name="rawImportText" value={importText} />
              {importSecretsHidden ? (
                <span className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                  <LockKeyhole size={14} className="text-primary" aria-hidden="true" />
                  Pasted secrets are hidden in this field before import.
                  <button
                    type="button"
                    className="font-semibold text-foreground underline-offset-2 hover:underline"
                    onClick={() => setShowRawImportText(true)}
                  >
                    Edit raw text
                  </button>
                </span>
              ) : null}
            </label>
          </div>

          <ImportPreview preview={preview} displayName={displayName} workflowTypeOverride={selectedTemplate?.type} />
        </div>
        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-zinc-950/10 bg-white/95 px-6 py-4 backdrop-blur">
          <p className="hidden text-xs leading-5 text-zinc-500 sm:block">
            The preview must be valid before the workflow can be imported.
          </p>
          <FormSubmitButton type="submit" disabled={!canSubmit} className="w-full sm:w-fit" pendingLabel="Importing...">
            <Plus size={15} aria-hidden="true" />
            Import workflow
          </FormSubmitButton>
        </div>
      </form>
    </div>
  );
}

function readImportSource(value: string | undefined): WorkflowImportSource {
  if (value === "curl" || value === "openapi" || value === "postman") {
    return value;
  }

  return "url";
}

function ImportPreview({
  preview,
  displayName,
  workflowTypeOverride,
}: {
  preview: ImportPreviewState;
  displayName: string;
  workflowTypeOverride?: WorkflowType;
}) {
  if (preview.status === "empty") {
    return (
      <aside
        data-testid="workflow-import-preview"
        className="rounded-lg bg-muted p-3"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Timer size={16} className="text-primary" aria-hidden="true" />
          Preview pending
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Paste import details to confirm the endpoint, method, auth mode, and first health check before creation.
        </p>
      </aside>
    );
  }

  if (preview.status === "error") {
    return (
      <aside
        data-testid="workflow-import-preview"
        className="rounded-lg bg-danger-background p-3 text-danger"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle size={16} aria-hidden="true" />
          Import needs attention
        </div>
        <p className="mt-2 text-sm leading-6">{preview.message}</p>
      </aside>
    );
  }

  const plan = preview.plan;
  const finalName = displayName.trim() || plan.name;
  const workflowType = workflowTypeOverride ?? plan.type;

  return (
    <aside
      data-testid="workflow-import-preview"
      className="rounded-lg bg-muted p-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
        Import preview
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <PreviewRow label="Name" value={finalName} />
        <PreviewRow label="Type" value={formatWorkflowType(workflowType)} />
        <PreviewRow label="Endpoint" value={plan.endpointUrl} breakValue />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Method</span>
          <Badge>{plan.method}</Badge>
        </div>
        <PreviewRow label="Auth" value={formatAuth(plan)} />
        <PreviewRow label="Check" value={`Every ${plan.checkFrequencyMinutes} min, ${plan.expectedStatus}, under ${plan.maxLatencyMs} ms`} />
        {plan.requestBody ? <PreviewRow label="Body" value="Request body detected" /> : null}
      </div>
      {plan.authType !== "none" ? (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-background p-3 text-xs leading-5 text-muted-foreground">
          <LockKeyhole size={14} className="text-primary" aria-hidden="true" />
          Auth secrets are encrypted on save and are not shown in previews.
        </p>
      ) : null}
    </aside>
  );
}

function PreviewRow({
  label,
  value,
  breakValue = false,
}: {
  label: string;
  value: string;
  breakValue?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className={breakValue ? "break-all font-medium" : "font-medium"}>{value}</span>
    </div>
  );
}

function formatAuth(plan: WorkflowImportPlan) {
  if (plan.authType === "bearer") {
    return "Bearer token detected";
  }

  if (plan.authType === "api_key_header") {
    return plan.authHeaderName ? `${plan.authHeaderName} header detected` : "API key header detected";
  }

  if (plan.authType === "basic") {
    return "Basic auth detected";
  }

  return "No auth";
}

function formatWorkflowType(type: WorkflowType): string {
  return type.replaceAll("_", " ");
}
