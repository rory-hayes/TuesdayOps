import Link from "next/link";
import { Activity, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createWorkflowAction, createWorkflowFromImportAction } from "@/lib/workflows/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatCurrency, formatPercentage, formatRelativeTime } from "@/lib/formatting";
import { WORKFLOW_ONBOARDING_TEMPLATES } from "@/lib/workflows/onboarding";

export function WorkflowsPage({
  data,
  error,
}: {
  data: TuesdayOpsSeedData;
  error?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Workflows</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            Monitored AI workflows
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Registry of client automations, agents, endpoints, and MCP services under maintenance.
          </p>
        </div>
        <Button size="sm">
          <Plus size={15} aria-hidden="true" />
          Add workflow
        </Button>
      </section>

      {error ? <p className="rounded-lg bg-danger-background p-3 text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Quick workflow import</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a monitored workflow from a URL, cURL command, OpenAPI JSON, or Postman collection JSON.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4">
            {WORKFLOW_ONBOARDING_TEMPLATES.map((template) => (
              <div key={template.type} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{template.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{template.detail}</p>
              </div>
            ))}
          </div>
          {data.clients.length ? (
            <form action={createWorkflowFromImportAction} className="grid gap-3 md:grid-cols-4">
              <label className="block text-sm font-medium">
                Import client
                <select
                  required
                  name="clientId"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {data.clients
                    .filter((client) => !client.archived)
                    .map((client) => (
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
                  defaultValue="url"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="url">URL</option>
                  <option value="curl">cURL</option>
                  <option value="openapi">OpenAPI JSON</option>
                  <option value="postman">Postman JSON</option>
                </select>
              </label>
              <Input
                className="md:col-span-2"
                label="Imported workflow name"
                name="importedWorkflowName"
                placeholder="Lead Intake Webhook"
              />
              <label className="block text-sm font-medium md:col-span-4">
                Import details
                <textarea
                  required
                  name="importText"
                  placeholder="https://api.example.com/health"
                  rows={5}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <Button type="submit" className="md:col-span-4 md:w-fit">
                <Plus size={15} aria-hidden="true" />
                Import workflow
              </Button>
            </form>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Add a client before importing a workflow endpoint.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Add workflow endpoint</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Register a live client endpoint and create its first health check.
          </p>
        </CardHeader>
        <CardContent>
          {data.clients.length ? (
            <form action={createWorkflowAction} className="grid gap-3 md:grid-cols-4">
              <label className="block text-sm font-medium">
                Client
                <select
                  required
                  name="clientId"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {data.clients
                    .filter((client) => !client.archived)
                    .map((client) => (
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
              <Input className="md:col-span-2" label="Endpoint URL" name="endpointUrl" placeholder="https://example.com/api/health" type="url" required />
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
                Add workflow
              </Button>
            </form>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Add a client before registering a workflow endpoint.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Workflow registry</h2>
            <p className="mt-1 text-sm text-muted-foreground">Production checks and report inclusion.</p>
          </div>
          <Activity size={18} className="text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[940px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-5 py-3 font-medium">Workflow</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Pass rate</th>
                <th className="px-5 py-3 font-medium">Latency</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Last check</th>
                <th className="px-5 py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {data.workflows.length ? data.workflows.map((workflow) => {
                const client = data.clients.find((candidate) => candidate.id === workflow.clientId);

                return (
                  <tr key={workflow.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <Link href={`/workflows/${workflow.id}`} className="font-medium text-primary">
                        {workflow.name}
                      </Link>
                      <p className="mt-1 max-w-64 truncate text-xs text-muted-foreground">
                        {workflow.endpointUrl}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{client?.name}</td>
                    <td className="px-5 py-4">
                      <Badge variant="muted">{workflow.type.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={workflow.status} />
                    </td>
                    <td className="px-5 py-4">{formatPercentage(workflow.passRate)}</td>
                    <td className="px-5 py-4">{workflow.latencyMs} ms</td>
                    <td className="px-5 py-4">{formatCurrency(workflow.monthlyCost)}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {formatRelativeTime(workflow.lastCheckAt)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={workflow.includedInReports ? "success" : "muted"}>
                        {workflow.includedInReports ? "included" : "excluded"}
                      </Badge>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={9}>
                    Register your first workflow endpoint to create a health check.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
