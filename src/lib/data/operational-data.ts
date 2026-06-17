import type {
  Check,
  CheckRun,
  CheckRunStatus,
  Client,
  Issue,
  ReportItem,
  ReportMetrics,
  ReportStatus,
  TestCase,
  TestPack,
  TestRun,
  TestRunStatus,
  TuesdayOpsSeedData,
  Workflow,
  WorkflowApiKeySummary,
  WorkflowStatus,
} from "@/lib/domain/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkConfigSchema } from "@/lib/checks/assertions";
import { createClient } from "@/lib/supabase/server";
import { buildTestPackSummary } from "@/lib/test-packs/runner";

type ClientRow = {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  industry: string;
  report_recipient_email: string;
  report_automation_enabled: boolean | null;
  next_report_due_on: string | null;
  last_report_generated_at: string | null;
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
  archived_at: string | null;
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
  cost_estimate: number | string | null;
  model: string | null;
  prompt_version: string | null;
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
  test_run_id: string | null;
  owner_user_id: string | null;
  severity: Issue["severity"];
  status: Issue["status"];
  title: string;
  description: string;
  suggested_action: string;
  reportable: boolean;
  occurrence_count: number | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  last_seen_at: string | null;
};

type TestPackRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  name: string;
  description: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type TestCaseRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  test_pack_id: string;
  name: string;
  input_json: unknown;
  assertions_json: unknown;
  archived_at: string | null;
  created_at: string;
};

type TestRunRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  test_pack_id: string;
  test_case_id: string;
  status: TestRunStatus;
  status_code: number | null;
  latency_ms: number;
  response_summary: string;
  error_message: string | null;
  created_at: string;
};

type WorkflowApiKeyRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  agency_id: string;
  client_id: string;
  period: string;
  period_label: string;
  status: ReportStatus;
  summary: string;
  metrics_json: unknown;
  recommendations_json: unknown;
  pdf_url: string | null;
  send_error: string | null;
  generated_at: string | null;
  sent_at: string | null;
  created_at: string;
};

type ReportItemRow = {
  id: string;
  agency_id: string;
  report_id: string;
  category: ReportItem["category"];
  title: string;
  body: string;
  sort_order: number;
};

type AgencySnapshot = TuesdayOpsSeedData["agency"];

export async function getOperationalData(
  agency: AgencySnapshot,
  supabaseOverride?: SupabaseClient,
): Promise<TuesdayOpsSeedData> {
  const supabase = supabaseOverride ?? await createClient();
  const [
    clientsResult,
    workflowsResult,
    checksResult,
    runsResult,
    issuesResult,
    testPacksResult,
    testCasesResult,
    testRunsResult,
    workflowApiKeysResult,
    reportsResult,
    reportItemsResult,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflows")
      .select("*")
      .eq("agency_id", agency.id)
      .is("archived_at", null)
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
    supabase
      .from("test_packs")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("test_cases")
      .select("*")
      .eq("agency_id", agency.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("test_runs")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("workflow_api_keys")
      .select("id, agency_id, workflow_id, name, key_prefix, last_used_at, revoked_at, created_at")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("report_items")
      .select("*")
      .eq("agency_id", agency.id)
      .order("sort_order", { ascending: true }),
  ]);

  const error =
    clientsResult.error ??
    workflowsResult.error ??
    checksResult.error ??
    runsResult.error ??
    issuesResult.error ??
    testPacksResult.error ??
    testCasesResult.error ??
    testRunsResult.error ??
    workflowApiKeysResult.error ??
    reportsResult.error ??
    reportItemsResult.error;

  if (error) {
    throw new Error(`Unable to load operational data: ${error.message}`);
  }

  const clientRows = (clientsResult.data ?? []) as ClientRow[];
  const workflowRows = (workflowsResult.data ?? []) as WorkflowRow[];
  const checkRows = (checksResult.data ?? []) as CheckRow[];
  const runRows = (runsResult.data ?? []) as CheckRunRow[];
  const issueRows = (issuesResult.data ?? []) as IssueRow[];
  const testPackRows = (testPacksResult.data ?? []) as TestPackRow[];
  const testCaseRows = (testCasesResult.data ?? []) as TestCaseRow[];
  const testRunRows = (testRunsResult.data ?? []) as TestRunRow[];
  const workflowApiKeyRows = (workflowApiKeysResult.data ?? []) as WorkflowApiKeyRow[];
  const reportRows = (reportsResult.data ?? []) as ReportRow[];
  const reportItemRows = (reportItemsResult.data ?? []) as ReportItemRow[];

  const workflows = workflowRows.map((row) => mapWorkflow(row, runRows));
  const clients = clientRows.map((row) => mapClient(row, workflows));
  const checks = checkRows.map((row) => mapCheck(row, runRows));
  const checkRuns = runRows.map(mapCheckRun);
  const issues = issueRows.map(mapIssue);
  const testPacks = testPackRows.map((row) => mapTestPack(row, testCaseRows, testRunRows));
  const testCases = testCaseRows.map((row) => mapTestCase(row, testRunRows));
  const testRuns = testRunRows.map(mapTestRun);
  const workflowApiKeys = workflowApiKeyRows.map(mapWorkflowApiKey);
  const reports = reportRows.map((row) => mapReport(row, clientRows));
  const reportItems = reportItemRows.map(mapReportItem);

  return {
    agency,
    clients,
    workflows,
    checks,
    checkRuns,
    issues,
    testPacks,
    testCases,
    testRuns,
    workflowApiKeys,
    reports,
    reportItems,
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
      .filter((value): value is string => Boolean(value))
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
    reportAutomationEnabled: Boolean(row.report_automation_enabled),
    nextReportDueOn: row.next_report_due_on ?? undefined,
    lastReportGeneratedAt: row.last_report_generated_at ?? undefined,
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
    lastCheckAt: latestRun?.completed_at ?? row.last_check_at ?? undefined,
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
    costEstimate: row.cost_estimate == null ? undefined : Number(row.cost_estimate),
    model: row.model ?? undefined,
    promptVersion: row.prompt_version ?? undefined,
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
    testRunId: row.test_run_id ?? undefined,
    ownerUserId: row.owner_user_id ?? undefined,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action,
    owner: row.owner_user_id ? "Assigned" : "Unassigned",
    reportable: row.reportable,
    occurrenceCount: row.occurrence_count ?? 1,
    detectedAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
  };
}

function mapTestPack(
  row: TestPackRow,
  testCaseRows: TestCaseRow[],
  testRunRows: TestRunRow[],
): TestPack {
  const packCases = testCaseRows.filter((testCase) => testCase.test_pack_id === row.id);
  const packRuns = testRunRows.filter((run) => run.test_pack_id === row.id);
  const summary = buildTestPackSummary({
    caseCount: packCases.length,
    runs: packRuns.map((run) => ({
      status: run.status,
      createdAt: run.created_at,
    })),
  });

  return {
    id: row.id,
    agencyId: row.agency_id,
    workflowId: row.workflow_id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    caseCount: summary.caseCount,
    passRate: summary.passRate,
    lastRunAt: packRuns.length ? summary.lastRunAt : row.updated_at,
  };
}

function mapTestCase(row: TestCaseRow, testRunRows: TestRunRow[]): TestCase {
  const latestRun = testRunRows.find((run) => run.test_case_id === row.id);

  return {
    id: row.id,
    agencyId: row.agency_id,
    workflowId: row.workflow_id,
    testPackId: row.test_pack_id,
    name: row.name,
    inputJson: row.input_json,
    assertionsJson: row.assertions_json,
    createdAt: row.created_at,
    latestStatus: latestRun?.status ?? "not_run",
  };
}

function mapTestRun(row: TestRunRow): TestRun {
  return {
    id: row.id,
    agencyId: row.agency_id,
    workflowId: row.workflow_id,
    testPackId: row.test_pack_id,
    testCaseId: row.test_case_id,
    status: row.status,
    statusCode: row.status_code ?? undefined,
    latencyMs: row.latency_ms,
    responseSummary: row.response_summary,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
  };
}

function mapWorkflowApiKey(row: WorkflowApiKeyRow): WorkflowApiKeySummary {
  return {
    id: row.id,
    agencyId: row.agency_id,
    workflowId: row.workflow_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mapReport(row: ReportRow, clientRows: ClientRow[]) {
  const client = clientRows.find((candidate) => candidate.id === row.client_id);
  const metrics = parseReportMetrics(row.metrics_json);
  const recommendations = Array.isArray(row.recommendations_json)
    ? row.recommendations_json.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id: row.id,
    agencyId: row.agency_id,
    clientId: row.client_id,
    clientName: client?.name ?? "Unknown client",
    period: row.period,
    periodLabel: row.period_label,
    status: row.status,
    checksRun: metrics.checksRun,
    issuesCaught: metrics.issuesCaught,
    issuesResolved: metrics.issuesResolved,
    workflowsMonitored: metrics.workflowsMonitored,
    passRate: metrics.passRate,
    summary: row.summary,
    recommendations,
    pdfUrl: row.pdf_url ?? undefined,
    sendError: row.send_error ?? undefined,
    sentAt: row.sent_at ?? undefined,
    generatedAt: row.generated_at ?? row.created_at,
  };
}

function mapReportItem(row: ReportItemRow): ReportItem {
  return {
    id: row.id,
    agencyId: row.agency_id,
    reportId: row.report_id,
    category: row.category,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
  };
}

function parseReportMetrics(value: unknown): ReportMetrics {
  const source = value && typeof value === "object" ? (value as Partial<ReportMetrics>) : {};

  return {
    workflowsMonitored: Number(source.workflowsMonitored ?? 0),
    checksRun: Number(source.checksRun ?? 0),
    issuesCaught: Number(source.issuesCaught ?? 0),
    issuesResolved: Number(source.issuesResolved ?? 0),
    testRuns: Number(source.testRuns ?? 0),
    testFailures: Number(source.testFailures ?? 0),
    passRate: Number(source.passRate ?? 0),
  };
}
