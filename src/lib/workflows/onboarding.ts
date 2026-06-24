import type { Workflow } from "@/lib/domain/types";

export type WorkflowImportSource =
  | "url"
  | "curl"
  | "openapi"
  | "postman"
  | "n8n_json"
  | "make_blueprint"
  | "zapier_json";
export type WorkflowImportPlatform = "api" | "n8n" | "make" | "zapier";
export type WorkflowImportTriggerType = "webhook" | "schedule" | "app_event" | "manual" | "unknown";

export type WorkflowOnboardingTemplate = {
  type: Workflow["type"];
  label: string;
  detail: string;
  defaultMethod: Workflow["method"];
  defaultFrequencyMinutes: number;
};

export type WorkflowImportPlan = {
  name: string;
  type: Workflow["type"];
  sourceType: WorkflowImportSource;
  endpointUrl: string;
  method: Workflow["method"];
  authType: Workflow["authType"];
  authHeaderName?: string;
  authSecret?: string;
  requestBody?: string;
  checkFrequencyMinutes: number;
  expectedStatus: number;
  maxLatencyMs: number;
  checkEnabled: boolean;
  maintenanceMap: WorkflowMaintenanceMap;
};

export type WorkflowMaintenanceMap = {
  sourcePlatform: WorkflowImportPlatform;
  sourceName: string;
  triggerType: WorkflowImportTriggerType;
  detectedApps: string[];
  detectedNodes: string[];
  detectedEndpointUrl?: string;
  suggestedChecks: string[];
  warnings: string[];
  requiresManualEndpoint: boolean;
};

export type WorkflowImportSnapshot = {
  sourcePlatform: WorkflowImportPlatform;
  sourceName: string;
  sourceType: WorkflowImportSource;
  triggerType: WorkflowImportTriggerType;
  detectedApps: string[];
  detectedNodes: string[];
  detectedEndpointUrl?: string;
  suggestedChecks: string[];
  warnings: string[];
  requiresManualEndpoint: boolean;
  checkEnabled: boolean;
};

export const WORKFLOW_ONBOARDING_TEMPLATES: WorkflowOnboardingTemplate[] = [
  {
    type: "http_endpoint",
    label: "HTTP endpoint",
    detail: "Health or status endpoint returning a 2xx response.",
    defaultMethod: "GET",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "webhook",
    label: "Webhook",
    detail: "A callable endpoint from an automation or agent workflow.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "n8n",
    label: "n8n",
    detail: "Production webhook URL from an n8n workflow.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "make",
    label: "Make",
    detail: "Custom webhook URL from a Make scenario.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "zapier",
    label: "Zapier",
    detail: "Catch hook or callable Zap endpoint.",
    defaultMethod: "POST",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "mcp_server",
    label: "MCP server",
    detail: "HTTP-accessible health endpoint for an MCP server.",
    defaultMethod: "GET",
    defaultFrequencyMinutes: 60,
  },
  {
    type: "custom_api",
    label: "Custom API",
    detail: "Any API route that can be checked with HTTP assertions.",
    defaultMethod: "GET",
    defaultFrequencyMinutes: 60,
  },
];

const validMethods = ["GET", "POST", "PUT", "PATCH"] as const;
const maxPlatformImportCharacters = 200_000;
const pendingRunLogEndpointUrl = "https://maintainflow.io/api/public/run-log";

export function parseWorkflowImport({
  source,
  text,
}: {
  source: WorkflowImportSource;
  text: string;
}): WorkflowImportPlan {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Import details are required.");
  }

  if (source === "url") {
    return withDefaults({
      endpointUrl: normalizeUrl(trimmed),
      method: "GET",
      type: "http_endpoint",
      authType: "none",
      sourceType: "url",
    });
  }

  if (source === "curl") {
    return parseCurlImport(trimmed);
  }

  if (source === "openapi") {
    return parseOpenApiImport(trimmed);
  }

  if (source === "postman") {
    return parsePostmanImport(trimmed);
  }

  if (source === "n8n_json") {
    return parseN8nImport(trimmed);
  }

  if (source === "make_blueprint") {
    return parseMakeBlueprintImport(trimmed);
  }

  return parseZapierImport(trimmed);
}

export function maskWorkflowImportSecrets(text: string): string {
  return text
    .replace(/(Authorization\s*:\s*Bearer\s+)([^"'\s]+)/gi, "$1[redacted]")
    .replace(/((?:X[-_])?API[-_]?Key\s*:\s*)([^"'\s]+)/gi, "$1[redacted]")
    .replace(/(-u|--user)\s+("[^"]*"|'[^']*'|\S+)/gi, "$1 [redacted]")
    .replace(
      /(["'](?:api[_-]?key|token|secret|password|authorization|bearer)["']\s*:\s*)(["'][^"']*["']|[^,}\s]+)/gi,
      '$1"[redacted]"',
    );
}

function parseCurlImport(command: string): WorkflowImportPlan {
  const tokens = tokenizeCommand(command);
  let endpointUrl = "";
  let method: Workflow["method"] | undefined;
  let requestBody: string | undefined;
  const headers: Array<{ key: string; value: string }> = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];

    if ((token === "-X" || token === "--request") && next) {
      method = parseMethod(next);
      index += 1;
      continue;
    }

    if ((token === "-H" || token === "--header") && next) {
      const header = parseHeader(next);
      if (header) {
        headers.push(header);
      }
      index += 1;
      continue;
    }

    if ((token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") && next) {
      requestBody = next;
      method ??= "POST";
      index += 1;
      continue;
    }

    if (!endpointUrl && isHttpUrl(token)) {
      endpointUrl = normalizeUrl(token);
    }
  }

  if (!endpointUrl) {
    throw new Error("A cURL import must include an HTTP URL.");
  }

  return withDefaults({
    endpointUrl,
    method: method ?? (requestBody ? "POST" : "GET"),
    type: inferWorkflowType(endpointUrl, "webhook"),
    sourceType: "curl",
    requestBody,
    ...inferAuth(headers),
  });
}

function parseOpenApiImport(text: string): WorkflowImportPlan {
  const document = parseOpenApiDocument(text);
  const paths = readRecord(document.paths);
  const serverUrl = readString(readArray(document.servers)[0]?.url) ?? "";

  for (const [path, pathItem] of Object.entries(paths)) {
    const operations = readRecord(pathItem);

    for (const method of validMethods) {
      const operation = readRecord(operations[method.toLowerCase()]);

      if (!Object.keys(operation).length) {
        continue;
      }

      const endpointUrl = normalizeUrl(joinUrl(serverUrl, path));
      const operationName =
        readString(operation.summary) ??
        readString(operation.operationId) ??
        buildNameFromUrl(endpointUrl);

      return withDefaults({
        name: operationName,
        endpointUrl,
        method,
        type: "custom_api",
        sourceType: "openapi",
        authType: "none",
        requestBody: extractOpenApiExampleBody(operation),
      });
    }
  }

  throw new Error("OpenAPI import must include at least one supported operation.");
}

function parseOpenApiDocument(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return parseJsonObject(trimmed, "OpenAPI");
  }

  const yaml = parseOpenApiYaml(trimmed);

  if (Object.keys(yaml.paths ?? {}).length) {
    return yaml;
  }

  try {
    return readRecord(JSON.parse(trimmed));
  } catch {
    throw new Error("OpenAPI import must be valid JSON.");
  }
}

function parsePostmanImport(text: string): WorkflowImportPlan {
  const collection = parseJsonObject(text, "Postman collection");
  const item = findFirstPostmanRequest(readArray(collection.item));

  if (!item) {
    throw new Error("Postman collection must include at least one request.");
  }

  const request = readRecord(item.request);
  const endpointUrl = normalizeUrl(readPostmanUrl(request.url));
  const method = parseMethod(readString(request.method) ?? "GET");
  const headers = readArray(request.header)
    .map((header) => readRecord(header))
    .map((header) => ({
      key: readString(header.key) ?? "",
      value: readString(header.value) ?? "",
    }))
    .filter((header) => header.key && header.value);
  const body = readRecord(request.body);

  return withDefaults({
    name: readString(item.name) ?? buildNameFromUrl(endpointUrl),
    endpointUrl,
    method,
    type: "custom_api",
    sourceType: "postman",
    requestBody: readString(body.raw),
    ...inferAuth(headers),
  });
}

function parseN8nImport(text: string): WorkflowImportPlan {
  assertPlatformImportSize(text, "n8n workflow JSON");
  const workflow = parseJsonObject(text, "n8n workflow JSON");
  const nodes = readArray(workflow.nodes);

  if (!nodes.length) {
    throw new Error("n8n workflow JSON must include at least one node.");
  }

  const name = readString(workflow.name) ?? "Imported n8n workflow";
  const nodeNames = nodes.map(formatN8nNodeName).filter(Boolean);
  const detectedApps = uniqueStrings(nodes.map(formatN8nAppName).filter(Boolean));
  const webhookNode = nodes.find(isN8nWebhookNode);
  const scheduleNode = nodes.find(isN8nScheduleNode);
  const endpointUrl = webhookNode ? findHttpUrl(readRecord(webhookNode.parameters)) : undefined;
  const method = webhookNode ? readN8nWebhookMethod(webhookNode) : "POST";
  const warnings = [
    ...buildImportWarningsFromText(text),
    ...(!endpointUrl && webhookNode
      ? ["n8n exports usually contain the webhook path, not the public production URL. Add the production webhook URL or heartbeat after import."]
      : []),
    ...(!webhookNode
      ? ["No n8n webhook trigger was detected. This import will create a maintenance map and disabled heartbeat check."]
      : []),
  ];

  return withDefaults({
    name,
    type: "n8n",
    sourceType: "n8n_json",
    endpointUrl: endpointUrl ?? pendingRunLogEndpointUrl,
    method,
    authType: "none",
    checkEnabled: Boolean(endpointUrl),
    triggerType: webhookNode ? "webhook" : scheduleNode ? "schedule" : "unknown",
    detectedApps,
    detectedNodes: nodeNames,
    detectedEndpointUrl: endpointUrl,
    suggestedChecks: buildPlatformSuggestedChecks({
      platform: "n8n",
      hasEndpoint: Boolean(endpointUrl),
      hasAiStep: nodes.some(isAiNode),
      hasSchedule: Boolean(scheduleNode),
    }),
    warnings,
    requiresManualEndpoint: !endpointUrl,
  });
}

function parseMakeBlueprintImport(text: string): WorkflowImportPlan {
  assertPlatformImportSize(text, "Make blueprint");
  const blueprint = parseJsonObject(text, "Make blueprint");
  const modules = readMakeModules(blueprint);

  if (!modules.length) {
    throw new Error("Make blueprint must include at least one module.");
  }

  const name = readString(blueprint.name) ??
    readString(readRecord(readRecord(blueprint.metadata).scenario).name) ??
    "Imported Make scenario";
  const moduleNames = modules.map(formatMakeModuleName).filter(Boolean);
  const detectedApps = uniqueStrings(modules.map(formatMakeAppName).filter(Boolean));
  const webhookModule = modules.find(isMakeWebhookModule);
  const scheduleModule = modules.find(isMakeScheduleModule);
  const endpointUrl = webhookModule ? findHttpUrl(webhookModule) : undefined;
  const warnings = [
    "Make blueprints do not reconnect app connections in Maintain Flow. Reconnect credentials in Make and use Maintain Flow for monitoring.",
    ...buildImportWarningsFromText(text),
    ...(!endpointUrl && webhookModule
      ? ["Make blueprints often reference a webhook module without the public webhook URL. Add the production URL or heartbeat after import."]
      : []),
  ];

  return withDefaults({
    name,
    type: "make",
    sourceType: "make_blueprint",
    endpointUrl: endpointUrl ?? pendingRunLogEndpointUrl,
    method: "POST",
    authType: "none",
    checkEnabled: Boolean(endpointUrl),
    triggerType: webhookModule ? "webhook" : scheduleModule ? "schedule" : "unknown",
    detectedApps,
    detectedNodes: moduleNames,
    detectedEndpointUrl: endpointUrl,
    suggestedChecks: buildPlatformSuggestedChecks({
      platform: "make",
      hasEndpoint: Boolean(endpointUrl),
      hasAiStep: modules.some(isAiLikeRecord),
      hasSchedule: Boolean(scheduleModule),
    }),
    warnings,
    requiresManualEndpoint: !endpointUrl,
  });
}

function parseZapierImport(text: string): WorkflowImportPlan {
  assertPlatformImportSize(text, "Zapier JSON");
  const parsed = parseJsonValue(text, "Zapier JSON");
  const payload = Array.isArray(parsed) ? { zaps: parsed } : readRecord(parsed);
  const zap = findZapierWorkflow(payload);
  const steps = readZapierSteps(zap ?? payload);

  if (!zap && !steps.length) {
    throw new Error("Zapier JSON must include a Zap workflow or at least one Zap step.");
  }

  const name = readString(zap?.name) ?? readString(zap?.title) ?? readString(payload.name) ?? "Imported Zapier workflow";
  const endpointUrl = findHttpUrl(zap ?? payload);
  const stepNames = steps.map(formatZapierStepName).filter(Boolean);
  const detectedApps = uniqueStrings(steps.map(formatZapierAppName).filter(Boolean));
  const triggerType = endpointUrl
    ? "webhook"
    : steps.some(isZapierTriggerStep)
      ? "app_event"
      : "unknown";
  const warnings = [
    "Zapier export access depends on account type. If this JSON omits a callable hook URL, use the generated manual mapping.",
    ...buildImportWarningsFromText(text),
  ];

  return withDefaults({
    name,
    type: "zapier",
    sourceType: "zapier_json",
    endpointUrl: endpointUrl ?? pendingRunLogEndpointUrl,
    method: "POST",
    authType: "none",
    checkEnabled: Boolean(endpointUrl),
    triggerType,
    detectedApps,
    detectedNodes: stepNames,
    detectedEndpointUrl: endpointUrl,
    suggestedChecks: buildPlatformSuggestedChecks({
      platform: "zapier",
      hasEndpoint: Boolean(endpointUrl),
      hasAiStep: steps.some(isAiLikeRecord),
      hasSchedule: steps.some(isZapierScheduleStep),
    }),
    warnings,
    requiresManualEndpoint: !endpointUrl,
  });
}

type WorkflowImportPlanDefaultsInput =
  Partial<Omit<WorkflowImportPlan, "maintenanceMap">> &
  Partial<WorkflowMaintenanceMap> &
  Pick<WorkflowImportPlan, "endpointUrl" | "method" | "type"> & {
    sourcePlatform?: WorkflowImportPlatform;
  };

function withDefaults(input: WorkflowImportPlanDefaultsInput): WorkflowImportPlan {
  const name = input.name ?? buildNameFromUrl(input.endpointUrl);
  const sourceType = input.sourceType ?? "url";
  const sourcePlatform = input.sourcePlatform ?? platformForImportSource(sourceType);
  const triggerType = input.triggerType ?? inferTriggerType(input.endpointUrl, sourceType);
  const detectedEndpointUrl = input.detectedEndpointUrl ?? (input.requiresManualEndpoint ? undefined : input.endpointUrl);
  const suggestedChecks = input.suggestedChecks ?? defaultSuggestedChecks(triggerType);
  const warnings = uniqueStrings(input.warnings ?? []);
  const requiresManualEndpoint = input.requiresManualEndpoint ?? false;
  const checkEnabled = input.checkEnabled ?? !requiresManualEndpoint;
  const maintenanceMap: WorkflowMaintenanceMap = {
    sourcePlatform,
    sourceName: input.sourceName ?? name,
    triggerType,
    detectedApps: uniqueStrings(input.detectedApps ?? []),
    detectedNodes: uniqueStrings(input.detectedNodes ?? []),
    detectedEndpointUrl,
    suggestedChecks,
    warnings,
    requiresManualEndpoint,
  };

  return {
    name,
    type: input.type,
    sourceType,
    endpointUrl: input.endpointUrl,
    method: input.method,
    authType: input.authType ?? "none",
    authHeaderName: input.authHeaderName,
    authSecret: input.authSecret,
    requestBody: input.requestBody,
    checkFrequencyMinutes: input.checkFrequencyMinutes ?? 60,
    expectedStatus: input.expectedStatus ?? 200,
    maxLatencyMs: input.maxLatencyMs ?? 5000,
    checkEnabled,
    maintenanceMap,
  };
}

export function buildWorkflowImportSnapshot(plan: WorkflowImportPlan): WorkflowImportSnapshot {
  return {
    sourcePlatform: plan.maintenanceMap.sourcePlatform,
    sourceName: plan.maintenanceMap.sourceName,
    sourceType: plan.sourceType,
    triggerType: plan.maintenanceMap.triggerType,
    detectedApps: plan.maintenanceMap.detectedApps,
    detectedNodes: plan.maintenanceMap.detectedNodes,
    detectedEndpointUrl: plan.maintenanceMap.detectedEndpointUrl,
    suggestedChecks: plan.maintenanceMap.suggestedChecks,
    warnings: plan.maintenanceMap.warnings,
    requiresManualEndpoint: plan.maintenanceMap.requiresManualEndpoint,
    checkEnabled: plan.checkEnabled,
  };
}

function assertPlatformImportSize(text: string, label: string) {
  if (text.length > maxPlatformImportCharacters) {
    throw new Error(`${label} is too large for quick import.`);
  }
}

function buildPlatformSuggestedChecks({
  platform,
  hasEndpoint,
  hasAiStep,
  hasSchedule,
}: {
  platform: Exclude<WorkflowImportPlatform, "api">;
  hasEndpoint: boolean;
  hasAiStep: boolean;
  hasSchedule: boolean;
}): string[] {
  const checks = [
    hasEndpoint
      ? "Endpoint health and latency check"
      : "Heartbeat or run-log check once the production URL is added",
    `${platformLabel(platform)} run-history freshness check`,
    "Failure-path and alert routing review",
  ];

  if (hasSchedule) {
    checks.push("Schedule freshness check");
  }

  if (hasAiStep) {
    checks.push("AI prompt/model regression check");
  }

  return checks;
}

function defaultSuggestedChecks(triggerType: WorkflowImportTriggerType): string[] {
  if (triggerType === "webhook") {
    return ["Endpoint health and latency check", "Payload schema check", "Failure response check"];
  }

  if (triggerType === "schedule") {
    return ["Run-history freshness check", "Schedule drift check", "Failure alert check"];
  }

  return ["Endpoint health check", "Response assertion check", "Failure alert check"];
}

function platformForImportSource(sourceType: WorkflowImportSource): WorkflowImportPlatform {
  if (sourceType === "n8n_json") {
    return "n8n";
  }

  if (sourceType === "make_blueprint") {
    return "make";
  }

  if (sourceType === "zapier_json") {
    return "zapier";
  }

  return "api";
}

function inferTriggerType(endpointUrl: string, sourceType: WorkflowImportSource): WorkflowImportTriggerType {
  if (sourceType === "url" || sourceType === "curl" || sourceType === "openapi" || sourceType === "postman") {
    return inferWorkflowType(endpointUrl, "custom_api") === "webhook" ? "webhook" : "manual";
  }

  return "unknown";
}

function platformLabel(platform: WorkflowImportPlatform): string {
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

function buildImportWarningsFromText(text: string): string[] {
  const warnings: string[] = [];

  if (/["']?(?:token|secret|password|api[_-]?key|authorization)["']?\s*[:=]/i.test(text) ||
    /Authorization\s*:\s*Bearer\s+\S+/i.test(text)) {
    warnings.push("Potential credentials were detected. Maintain Flow stores only the normalized maintenance map, not the raw export JSON.");
  }

  if (/credentials?["']?\s*[:=]/i.test(text)) {
    warnings.push("Credential references may be present in the export. Review the source tool before sharing full files with clients.");
  }

  return uniqueStrings(warnings);
}

function readMakeModules(blueprint: Record<string, unknown>): Record<string, unknown>[] {
  const flow = readArray(blueprint.flow);

  if (flow.length) {
    return flow;
  }

  const modules = readArray(blueprint.modules);

  if (modules.length) {
    return modules;
  }

  return readArray(readRecord(blueprint.scenario).flow);
}

function isN8nWebhookNode(node: Record<string, unknown>): boolean {
  return /webhook/i.test(`${readString(node.type) ?? ""} ${readString(node.name) ?? ""}`);
}

function isN8nScheduleNode(node: Record<string, unknown>): boolean {
  return /schedule|cron|interval/i.test(`${readString(node.type) ?? ""} ${readString(node.name) ?? ""}`);
}

function isAiNode(node: Record<string, unknown>): boolean {
  return isAiLikeText(`${readString(node.type) ?? ""} ${readString(node.name) ?? ""}`);
}

function isAiLikeRecord(record: Record<string, unknown>): boolean {
  return isAiLikeText(JSON.stringify(record).slice(0, 5000));
}

function isAiLikeText(value: string): boolean {
  return /openai|anthropic|claude|gemini|llm|ai|chatgpt|model/i.test(value);
}

function readN8nWebhookMethod(node: Record<string, unknown>): Workflow["method"] {
  const parameters = readRecord(node.parameters);
  const rawMethod = readString(parameters.httpMethod) ?? readString(parameters.method) ?? "POST";

  try {
    return parseMethod(rawMethod);
  } catch {
    return "POST";
  }
}

function formatN8nNodeName(node: Record<string, unknown>): string {
  return readString(node.name) ?? formatSourceIdentifier(readString(node.type) ?? "n8n node");
}

function formatN8nAppName(node: Record<string, unknown>): string {
  const type = readString(node.type);

  if (!type) {
    return readString(node.name) ?? "";
  }

  return formatSourceIdentifier(type.split(".").at(-1) ?? type);
}

function isMakeWebhookModule(module: Record<string, unknown>): boolean {
  return /webhook|gateway/i.test(`${readString(module.module) ?? ""} ${JSON.stringify(readRecord(module.metadata)).slice(0, 1000)}`);
}

function isMakeScheduleModule(module: Record<string, unknown>): boolean {
  return /schedule|cron|interval/i.test(`${readString(module.module) ?? ""} ${JSON.stringify(module).slice(0, 1000)}`);
}

function formatMakeModuleName(module: Record<string, unknown>): string {
  return readString(readRecord(module.metadata).designerLabel) ??
    readString(readRecord(module.metadata).label) ??
    formatSourceIdentifier(readString(module.module) ?? `Module ${String(module.id ?? "")}`.trim());
}

function formatMakeAppName(module: Record<string, unknown>): string {
  const value = readString(module.module);

  if (!value) {
    return "";
  }

  return formatSourceIdentifier(value.split(":")[0] ?? value);
}

function findZapierWorkflow(payload: Record<string, unknown>): Record<string, unknown> | null {
  const zaps = readArray(payload.zaps);

  if (zaps.length) {
    return zaps[0];
  }

  const workflows = readArray(payload.workflows);

  if (workflows.length) {
    return workflows[0];
  }

  if (readArray(payload.steps).length || readArray(payload.actions).length) {
    return payload;
  }

  return null;
}

function readZapierSteps(zap: Record<string, unknown>): Record<string, unknown>[] {
  const steps = readArray(zap.steps);

  if (steps.length) {
    return steps;
  }

  const actions = readArray(zap.actions);

  if (actions.length) {
    return actions;
  }

  return readArray(zap.nodes);
}

function formatZapierStepName(step: Record<string, unknown>): string {
  return readString(step.name) ??
    readString(step.title) ??
    readString(step.label) ??
    formatSourceIdentifier(readString(step.type) ?? "Zap step");
}

function formatZapierAppName(step: Record<string, unknown>): string {
  const app = readRecord(step.app);

  return readString(app.name) ??
    readString(app.title) ??
    readString(step.app) ??
    readString(step.service) ??
    readString(step.type) ??
    "";
}

function isZapierTriggerStep(step: Record<string, unknown>): boolean {
  return /trigger/i.test(`${readString(step.type) ?? ""} ${readString(step.kind) ?? ""} ${readString(step.name) ?? ""}`);
}

function isZapierScheduleStep(step: Record<string, unknown>): boolean {
  return /schedule|delay|cron/i.test(JSON.stringify(step).slice(0, 1000));
}

function findHttpUrl(value: unknown, seen = new Set<unknown>()): string | undefined {
  if (typeof value === "string") {
    const match = value.match(/https?:\/\/[^\s"',)\\]+/i);

    return match ? normalizeUrl(match[0]) : undefined;
  }

  if (!value || typeof value !== "object" || seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findHttpUrl(item, seen);

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (/token|secret|password|credential/i.test(key)) {
      continue;
    }

    const found = findHttpUrl(nested, seen);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 20);
}

function formatSourceIdentifier(value: string): string {
  return value
    .replace(/^n8n-nodes-base\./, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_:.]+/g, " ")
    .trim();
}

function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const char of command.trim()) {
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens.filter((token) => token !== "curl");
}

function parseHeader(value: string): { key: string; value: string } | null {
  const separatorIndex = value.indexOf(":");

  if (separatorIndex < 1) {
    return null;
  }

  return {
    key: value.slice(0, separatorIndex).trim(),
    value: value.slice(separatorIndex + 1).trim(),
  };
}

function inferAuth(headers: Array<{ key: string; value: string }>): Pick<
  WorkflowImportPlan,
  "authType" | "authHeaderName" | "authSecret"
> {
  const authorization = headers.find((header) => header.key.toLowerCase() === "authorization");

  if (authorization?.value.toLowerCase().startsWith("bearer ")) {
    return {
      authType: "bearer",
      authSecret: authorization.value.slice("bearer ".length).trim(),
    };
  }

  const apiKey = headers.find((header) => /api[-_]?key|x-api-key/i.test(header.key));

  if (apiKey) {
    return {
      authType: "api_key_header",
      authHeaderName: apiKey.key,
      authSecret: apiKey.value,
    };
  }

  return { authType: "none" };
}

function parseMethod(value: string): Workflow["method"] {
  const method = value.toUpperCase();

  if (validMethods.includes(method as Workflow["method"])) {
    return method as Workflow["method"];
  }

  throw new Error(`Unsupported workflow method: ${value}`);
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  try {
    return readRecord(JSON.parse(text));
  } catch {
    throw new Error(`${label} import must be valid JSON.`);
  }
}

function parseJsonValue(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} import must be valid JSON.`);
  }
}

function parseOpenApiYaml(text: string): Record<string, unknown> {
  const servers: Array<{ url: string }> = [];
  const paths: Record<string, Record<string, Record<string, unknown>>> = {};
  let section: "servers" | "paths" | null = null;
  let currentPath = "";
  let currentMethod = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "");
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed === "servers:") {
      section = "servers";
      continue;
    }

    if (trimmed === "paths:") {
      section = "paths";
      continue;
    }

    if (section === "servers") {
      const url = trimmed.match(/^-\s*url:\s*(.+)$/)?.[1] ?? trimmed.match(/^url:\s*(.+)$/)?.[1];
      if (url) {
        servers.push({ url: unquoteYamlScalar(url) });
      }
      continue;
    }

    if (section === "paths") {
      const pathMatch = line.match(/^\s{2}([^:\s][^:]*):\s*$/);
      if (pathMatch) {
        currentPath = pathMatch[1].trim();
        paths[currentPath] = paths[currentPath] ?? {};
        currentMethod = "";
        continue;
      }

      const methodMatch = line.match(/^\s{4}(get|post|put|patch):\s*$/i);
      if (methodMatch && currentPath) {
        currentMethod = methodMatch[1].toLowerCase();
        paths[currentPath][currentMethod] = paths[currentPath][currentMethod] ?? {};
        continue;
      }

      const propertyMatch = line.match(/^\s{6}(summary|operationId):\s*(.+)$/);
      if (propertyMatch && currentPath && currentMethod) {
        paths[currentPath][currentMethod][propertyMatch[1]] = unquoteYamlScalar(propertyMatch[2]);
      }
    }
  }

  return { servers, paths };
}

function unquoteYamlScalar(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function findFirstPostmanRequest(items: unknown[]): Record<string, unknown> | null {
  for (const item of items) {
    const record = readRecord(item);

    if (record.request) {
      return record;
    }

    const nested = findFirstPostmanRequest(readArray(record.item));

    if (nested) {
      return nested;
    }
  }

  return null;
}

function readPostmanUrl(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  const url = readRecord(value);
  const raw = readString(url.raw);

  if (raw) {
    return raw;
  }

  const protocol = readString(url.protocol) ?? "https";
  const host = readArray(url.host).map((part) => String(part)).join(".");
  const path = readArray(url.path).map((part) => String(part)).join("/");

  return `${protocol}://${host}${path ? `/${path}` : ""}`;
}

function extractOpenApiExampleBody(operation: Record<string, unknown>): string | undefined {
  const requestBody = readRecord(operation.requestBody);
  const content = readRecord(requestBody.content);
  const jsonContent = readRecord(content["application/json"]);
  const example = jsonContent.example;

  if (example === undefined) {
    return undefined;
  }

  return typeof example === "string" ? example : JSON.stringify(example);
}

function inferWorkflowType(endpointUrl: string, fallback: Workflow["type"]): Workflow["type"] {
  const value = endpointUrl.toLowerCase();

  if (value.includes("webhook") || value.includes("hooks.")) {
    return "webhook";
  }

  return fallback;
}

function buildNameFromUrl(endpointUrl: string): string {
  const url = new URL(endpointUrl);
  const pathName = url.pathname.split("/").filter(Boolean).at(-1);

  return [url.hostname, pathName].filter(Boolean).join(" ");
}

function joinUrl(base: string, path: string): string {
  if (isHttpUrl(path)) {
    return path;
  }

  if (!base) {
    throw new Error("OpenAPI import needs a server URL when paths are relative.");
  }

  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  const url = new URL(trimmed);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Workflow endpoint must be an HTTP or HTTPS URL.");
  }

  return trimmed;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
