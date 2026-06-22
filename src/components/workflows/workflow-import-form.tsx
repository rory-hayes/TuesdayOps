"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Braces, CheckCircle2, Cable, LockKeyhole, Plus, Timer, Workflow, Zap } from "lucide-react";
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
  onManualSetup?: () => void;
};

type ImportPreviewState =
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; plan: WorkflowImportPlan };

type ImportPath = "n8n" | "make" | "zapier" | "api";

const apiImportSources: Array<{
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

const platformImportOptions: Array<{
  path: ImportPath;
  label: string;
  detail: string;
  source: WorkflowImportSource;
  workflowType?: WorkflowType;
  placeholder: string;
  instructions: string;
  icon: typeof Workflow;
}> = [
  {
    path: "n8n",
    label: "n8n",
    detail: "Workflow JSON",
    source: "n8n_json",
    workflowType: "n8n",
    placeholder: '{"name":"Lead intake","nodes":[{"name":"Webhook","type":"n8n-nodes-base.webhook","parameters":{"path":"lead-intake"}}],"connections":{}}',
    instructions: "Workflow menu -> Download JSON.",
    icon: Workflow,
  },
  {
    path: "make",
    label: "Make",
    detail: "Blueprint JSON",
    source: "make_blueprint",
    workflowType: "make",
    placeholder: '{"name":"Lead intake scenario","flow":[{"id":1,"module":"gateway:CustomWebHook","parameters":{}}]}',
    instructions: "Scenario builder -> three dots -> Export blueprint.",
    icon: Braces,
  },
  {
    path: "zapier",
    label: "Zapier",
    detail: "Zap JSON",
    source: "zapier_json",
    workflowType: "zapier",
    placeholder: '{"zaps":[{"title":"Lead intake Zap","steps":[{"type":"trigger","app":{"name":"Webhooks by Zapier"}}]}]}',
    instructions: "Team/Enterprise: export Zap workflow JSON. Otherwise paste Zap steps for guided mapping.",
    icon: Zap,
  },
  {
    path: "api",
    label: "API / webhook",
    detail: "URL, cURL, OpenAPI, Postman",
    source: "curl",
    placeholder: 'curl -X POST "https://hooks.example.com/lead" -H "Authorization: Bearer ..." -d \'{"ping":true}\'',
    instructions: "Paste a URL, cURL command, OpenAPI JSON/YAML/URL, or Postman collection.",
    icon: Cable,
  },
];

export function WorkflowImportForm({ clients, action, onManualSetup }: WorkflowImportFormProps) {
  const [importPath, setImportPath] = useState<ImportPath>("n8n");
  const [apiImportSource, setApiImportSource] = useState<WorkflowImportSource>("curl");
  const [importText, setImportText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showRawImportText, setShowRawImportText] = useState(false);
  const selectedPlatform = platformImportOptions.find((option) => option.path === importPath) ?? platformImportOptions[0];
  const importSource = importPath === "api" ? apiImportSource : selectedPlatform.source;
  const workflowTypeOverride = selectedPlatform.workflowType;
  const selectedSource = importPath === "api"
    ? apiImportSources.find((source) => source.value === apiImportSource) ?? apiImportSources[1]
    : selectedPlatform;
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
            sourceType: "openapi",
            endpointUrl: importText.trim(),
            method: "GET",
            authType: "none",
            checkFrequencyMinutes: 60,
            expectedStatus: 200,
            maxLatencyMs: 5000,
            checkEnabled: true,
            maintenanceMap: {
              sourcePlatform: "api",
              sourceName: "OpenAPI URL import",
              triggerType: "manual",
              detectedApps: [],
              detectedNodes: [],
              detectedEndpointUrl: importText.trim(),
              suggestedChecks: ["Endpoint health check", "Response assertion check", "Failure alert check"],
              warnings: [],
              requiresManualEndpoint: false,
            },
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
        message: error instanceof Error ? error.message : "Workflow import could not be read. Check the source format and try again.",
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
        <p className="text-sm font-medium">Import from</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {platformImportOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.path}
                type="button"
                aria-label={option.label}
                aria-pressed={importPath === option.path}
                className={`grid min-h-24 gap-2 rounded-lg border p-3 text-left transition-colors focus:border-primary focus:outline-none ${
                  importPath === option.path
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setImportPath(option.path);
                  setImportText("");
                  setShowRawImportText(false);
                }}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon size={16} className="text-primary" aria-hidden="true" />
                  {option.label}
                </span>
                <span className="text-xs leading-5 text-muted-foreground">{option.detail}</span>
              </button>
            );
          })}
          {onManualSetup ? (
            <button
              type="button"
              aria-label="Manual setup"
              className="grid min-h-24 gap-2 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted focus:border-primary focus:outline-none"
              onClick={onManualSetup}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Plus size={16} className="text-primary" aria-hidden="true" />
                Manual setup
              </span>
              <span className="text-xs leading-5 text-muted-foreground">Endpoint and check settings</span>
            </button>
          ) : null}
        </div>
      </div>

      <form action={action} className="grid gap-4">
        {workflowTypeOverride ? <input type="hidden" name="workflowType" value={workflowTypeOverride} /> : null}
        <input type="hidden" name="importSource" value={importSource} />
        <div className="grid gap-4 pb-16 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-muted p-3 text-sm leading-6 text-muted-foreground md:col-span-4">
              <span className="font-medium text-foreground">{selectedPlatform.label}: </span>
              {selectedPlatform.instructions}
            </div>
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
            {importPath === "api" ? (
              <label className="block text-sm font-medium">
                API source
                <select
                  required
                  value={apiImportSource}
                  onChange={(event) => {
                    setApiImportSource(event.currentTarget.value as WorkflowImportSource);
                    setImportText("");
                    setShowRawImportText(false);
                  }}
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {apiImportSources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
            <label className={`block text-sm font-medium ${importPath === "api" ? "md:col-span-4" : "md:col-span-4"}`}>
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
  const map = plan.maintenanceMap;

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
        <PreviewRow label="Source" value={`${formatSourcePlatform(map.sourcePlatform)} - ${formatTriggerType(map.triggerType)}`} />
        {map.detectedApps.length ? <PreviewRow label="Apps" value={map.detectedApps.slice(0, 4).join(", ")} /> : null}
        {map.detectedNodes.length ? <PreviewRow label="Detected" value={map.detectedNodes.slice(0, 3).join(", ")} /> : null}
        <PreviewRow
          label={map.requiresManualEndpoint ? "Next setup" : "Endpoint"}
          value={map.requiresManualEndpoint ? "Add production webhook or heartbeat" : plan.endpointUrl}
          breakValue={!map.requiresManualEndpoint}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Method</span>
          <Badge>{plan.method}</Badge>
        </div>
        <PreviewRow label="Auth" value={formatAuth(plan)} />
        <PreviewRow
          label="Check"
          value={plan.checkEnabled
            ? `Every ${plan.checkFrequencyMinutes} min, ${plan.expectedStatus}, under ${plan.maxLatencyMs} ms`
            : "Created disabled until endpoint is added"}
        />
        {map.suggestedChecks.length ? <PreviewList label="Suggested checks" values={map.suggestedChecks.slice(0, 3)} /> : null}
        {map.warnings.length ? <PreviewList label="Warnings" values={map.warnings.slice(0, 2)} /> : null}
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

function PreviewList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <ul className="grid gap-1 text-sm leading-5">
        {values.map((value) => (
          <li key={value} className="rounded-md bg-background px-2 py-1 text-muted-foreground">
            {value}
          </li>
        ))}
      </ul>
    </div>
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

function formatSourcePlatform(platform: string): string {
  if (platform === "n8n") {
    return "n8n";
  }

  if (platform === "make") {
    return "Make";
  }

  if (platform === "zapier") {
    return "Zapier";
  }

  return "API";
}

function formatTriggerType(triggerType: string): string {
  return triggerType.replaceAll("_", " ");
}
