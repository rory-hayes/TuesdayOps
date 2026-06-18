export type WorkflowStatus = "healthy" | "degraded" | "failed" | "unknown";
export type IssueStatus = "open" | "in_review" | "snoozed" | "resolved" | "ignored";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type WorkflowType =
  | "http_endpoint"
  | "webhook"
  | "n8n"
  | "make"
  | "zapier"
  | "mcp_server"
  | "custom_api"
  | "manual_log";
export type CheckType = "health" | "synthetic" | "schema" | "latency" | "cost" | "ai_judge";
export type CheckRunStatus = "healthy" | "degraded" | "failed" | "skipped";
export type ReportStatus = "draft" | "ready_to_send" | "sent" | "failed";
export type TestRunStatus = "passed" | "failed" | "skipped";
export type ReportItemCategory =
  | "workflow_health"
  | "issues_caught"
  | "issues_resolved"
  | "qa_checks"
  | "model_prompt_changes"
  | "recommendation";

export type Agency = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  plan: string;
  billingCustomerId?: string;
  billingSubscriptionId?: string;
  billingStatus: string;
  billingPriceId?: string;
  billingCurrentPeriodEnd?: string;
  trialEndsAt?: string;
};

export type Client = {
  id: string;
  agencyId: string;
  name: string;
  slug: string;
  industry: string;
  owner: string;
  reportRecipientEmail: string;
  reportStatus: "not_started" | "draft" | "ready" | "sent";
  reportAutomationEnabled: boolean;
  nextReportDueOn?: string;
  lastReportGeneratedAt?: string;
  healthScore: number;
  lastActivityAt: string;
  notes: string;
  archived: boolean;
};

export type Workflow = {
  id: string;
  agencyId: string;
  clientId: string;
  name: string;
  type: WorkflowType;
  environment: "production" | "staging" | "development";
  endpointUrl: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  authType: "none" | "bearer" | "api_key_header" | "basic";
  checkFrequencyMinutes: number;
  status: WorkflowStatus;
  passRate: number;
  latencyMs: number;
  monthlyCost: number;
  lastCheckAt?: string;
  includedInReports: boolean;
};

export type Check = {
  id: string;
  agencyId: string;
  workflowId: string;
  name: string;
  type: CheckType;
  schedule: string;
  enabled: boolean;
  configJson: unknown;
  assertionCount: number;
  latestStatus: CheckRunStatus;
};

export type CheckRun = {
  id: string;
  agencyId: string;
  clientId: string;
  workflowId: string;
  checkId: string;
  status: CheckRunStatus;
  statusCode?: number;
  latencyMs: number;
  responseSummary: string;
  errorMessage?: string;
  costEstimate?: number;
  model?: string;
  promptVersion?: string;
  startedAt: string;
  completedAt: string;
};

export type Issue = {
  id: string;
  agencyId: string;
  clientId: string;
  workflowId: string;
  checkRunId?: string;
  testRunId?: string;
  ownerUserId?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  suggestedAction: string;
  owner: string;
  reportable: boolean;
  occurrenceCount: number;
  detectedAt: string;
  lastSeenAt: string;
  maintenanceNote?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  snoozedUntil?: string;
};

export type TestPack = {
  id: string;
  agencyId: string;
  workflowId: string;
  name: string;
  description: string;
  enabled: boolean;
  caseCount: number;
  passRate: number;
  lastRunAt: string;
};

export type TestCase = {
  id: string;
  agencyId: string;
  workflowId: string;
  testPackId: string;
  name: string;
  inputJson: unknown;
  assertionsJson: unknown;
  createdAt: string;
  latestStatus: TestRunStatus | "not_run";
};

export type TestRun = {
  id: string;
  agencyId: string;
  workflowId: string;
  testPackId: string;
  testCaseId: string;
  status: TestRunStatus;
  statusCode?: number;
  latencyMs: number;
  responseSummary: string;
  errorMessage?: string;
  createdAt: string;
};

export type WorkflowApiKeySummary = {
  id: string;
  agencyId: string;
  workflowId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type ReportSummary = {
  id: string;
  agencyId: string;
  clientId: string;
  clientName: string;
  period: string;
  periodLabel: string;
  status: ReportStatus;
  checksRun: number;
  issuesCaught: number;
  issuesResolved: number;
  workflowsMonitored: number;
  passRate: number;
  summary: string;
  recommendations: string[];
  pdfUrl?: string;
  sendError?: string;
  sentAt?: string;
  generatedAt?: string;
};

export type ReportMetrics = {
  workflowsMonitored: number;
  checksRun: number;
  issuesCaught: number;
  issuesResolved: number;
  testRuns: number;
  testFailures: number;
  passRate: number;
};

export type ReportItem = {
  id: string;
  agencyId: string;
  reportId: string;
  category: ReportItemCategory;
  title: string;
  body: string;
  sortOrder: number;
};

export type ReportDraft = {
  clientId: string;
  clientName: string;
  period: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  metrics: ReportMetrics;
  recommendations: string[];
  items: Array<Omit<ReportItem, "id" | "agencyId" | "reportId">>;
};

export type TuesdayOpsSeedData = {
  agency: Agency;
  clients: Client[];
  workflows: Workflow[];
  checks: Check[];
  checkRuns: CheckRun[];
  issues: Issue[];
  testPacks: TestPack[];
  testCases: TestCase[];
  testRuns: TestRun[];
  workflowApiKeys: WorkflowApiKeySummary[];
  reports: ReportSummary[];
  reportItems: ReportItem[];
};

export type PortfolioSummary = {
  activeClients: number;
  monitoredWorkflows: number;
  openIssues: number;
  checkPassRate: number;
};

export type WorkflowHealthRow = {
  workflowId: string;
  workflowName: string;
  clientName: string;
  status: WorkflowStatus;
  passRate: number;
  latencyMs: number;
  lastCheckAt?: string;
  openIssues: number;
  includedInReports: boolean;
};
