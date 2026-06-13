import type {
  Check,
  CheckRun,
  CheckRunStatus,
  Client,
  Issue,
  TuesdayOpsSeedData,
  Workflow,
  WorkflowStatus,
} from "@/lib/domain/types";
import { checkConfigSchema } from "@/lib/checks/assertions";
import { createClient } from "@/lib/supabase/server";

type ClientRow = {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  industry: string;
  report_recipient_email: string;
  notes: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type WorkflowRow = {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  type: Workflow["type"];
  environment: Workflow["environment"];
  endpoint_url: string;
  method: Workflow["method"];
  auth_type: Workflow["authType"];
  check_frequency_minutes: number;
  status: WorkflowStatus;
  pass_rate: number | string;
  latency_ms: number;
  monthly_cost: number | string;
  last_check_at: string | null;
  included_in_reports: boolean;
  created_at: string;
  updated_at: string;
};

type CheckRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  name: string;
  type: Check["type"];
  config_json: unknown;
  enabled: boolean;
  schedule: string;
  created_at: string;
  updated_at: string;
};

type CheckRunRow = {
  id: string;
  agency_id: string;
  client_id: string;
  workflow_id: string;
  check_id: string;
  status: CheckRunStatus;
  status_code: number | null;
  latency_ms: number;
  response_summary: string;
  error_message: string | null;
  started_at: string;
  completed_at: string;
  created_at: string;
};

type IssueRow = {
  id: string;
  agency_id: string;
  client_id: string;
  workflow_id: string;
  check_run_id: string | null;
  severity: Issue["severity"];
  status: Issue["status"];
  title: string;
  description: string;
  suggested_action: string;
  reportable: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

type AgencySnapshot = TuesdayOpsSeedData["agency"];

export async function getOperationalData(
  agency: AgencySnapshot,
): Promise<TuesdayOpsSeedData> {
  const supabase = await createClient();
  const [clientsResult, workflowsResult, checksResult, runsResult, issuesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflows")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("checks")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("check_runs")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("issues")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
  ]);

  const error =
    clientsResult.error ??
    workflowsResult.error ??
    checksResult.error ??
    runsResult.error ??
    issuesResult.error;

  if (error) {
    throw new Error(`Unable to load operational data: ${error.message}`);
  }

  const clientRows = (clientsResult.data ?? []) as ClientRow[];
  const workflowRows = (workflowsResult.data ?? []) as WorkflowRow[];
  const checkRows = (checksResult.data ?? []) as CheckRow[];
  const runRows = (runsResult.data ?? []) as CheckRunRow[];
  const issueRows = (issuesResult.data ?? []) as IssueRow[];

  const workflows = workflowRows.map((row) => mapWorkflow(row, runRows));
  const clients = clientRows.map((row) => mapClient(row, workflows));
  const checks = checkRows.map((row) => mapCheck(row, runRows));
  const checkRuns = runRows.map(mapCheckRun);
  const issues = issueRows.map(mapIssue);

  return {
    agency,
    clients,
    workflows,
    checks,
    checkRuns,
    issues,
    testPacks: [],
    reports: [],
  };
}

export async function getWorkflowOperationalData(
  agency: AgencySnapshot,
  workflowId: string,
): Promise<TuesdayOpsSeedData> {
  const data = await getOperationalData(agency);
  const workflow = data.workflows.find((candidate) => candidate.id === workflowId);

  if (!workflow) {
    throw new Error("Workflow not found.");
  }

  return data;
}

function mapClient(row: ClientRow, workflows: Workflow[]): Client {
  const clientWorkflows = workflows.filter((workflow) => workflow.clientId === row.id);
  const healthScore = clientWorkflows.length
    ? Math.round(
        clientWorkflows.reduce((total, workflow) => total + workflow.passRate, 0) /
          clientWorkflows.length,
      )
    : 100;
  const lastActivityAt =
    clientWorkflows
      .map((workflow) => workflow.lastCheckAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? row.updated_at;

  return {
    id: row.id,
    agencyId: row.agency_id,
    name: row.name,
    slug: row.slug,
    industry: row.industry,
    owner: "Unassigned",
    reportRecipientEmail: row.report_recipient_email,
    reportStatus: "not_started",
    healthScore,
    lastActivityAt,
    notes: row.notes,
    archived: Boolean(row.archived_at),
  };
}

function mapWorkflow(row: WorkflowRow, runRows: CheckRunRow[]): Workflow {
  const recentRuns = runRows.filter((run) => run.workflow_id === row.id);
  const healthyRuns = recentRuns.filter((run) => run.status === "healthy").length;
  const passRate = recentRuns.length
    ? Math.round((healthyRuns / recentRuns.length) * 100)
    : Number(row.pass_rate);
  const latestRun = recentRuns[0];

  return {
    id: row.id,
    agencyId: row.agency_id,
    clientId: row.client_id,
    name: row.name,
    type: row.type,
    environment: row.environment,
    endpointUrl: row.endpoint_url,
    method: row.method,
    authType: row.auth_type,
    checkFrequencyMinutes: row.check_frequency_minutes,
    status: latestRun?.status === "skipped" ? "unknown" : latestRun?.status ?? row.status,
    passRate,
    latencyMs: latestRun?.latency_ms ?? row.latency_ms,
    monthlyCost: Number(row.monthly_cost),
    lastCheckAt: latestRun?.completed_at ?? row.last_check_at ?? row.updated_at,
    includedInReports: row.included_in_reports,
  };
}

function mapCheck(row: CheckRow, runRows: CheckRunRow[]): Check {
  const latestRun = runRows.find((run) => run.check_id === row.id);
  const config = checkConfigSchema.safeParse(row.config_json);

  return {
    id: row.id,
    agencyId: row.agency_id,
    workflowId: row.workflow_id,
    name: row.name,
    type: row.type,
    schedule: row.schedule,
    enabled: row.enabled,
    assertionCount: config.success ? config.data.assertions.length : 0,
    latestStatus: latestRun?.status ?? "skipped",
  };
}

function mapCheckRun(row: CheckRunRow): CheckRun {
  return {
    id: row.id,
    agencyId: row.agency_id,
    clientId: row.client_id,
    workflowId: row.workflow_id,
    checkId: row.check_id,
    status: row.status,
    statusCode: row.status_code ?? undefined,
    latencyMs: row.latency_ms,
    responseSummary: row.response_summary,
    errorMessage: row.error_message ?? undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapIssue(row: IssueRow): Issue {
  return {
    id: row.id,
    agencyId: row.agency_id,
    clientId: row.client_id,
    workflowId: row.workflow_id,
    checkRunId: row.check_run_id ?? undefined,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action,
    owner: "Unassigned",
    reportable: row.reportable,
    detectedAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
  };
}
