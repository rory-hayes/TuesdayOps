import type {
  Issue,
  ReportDraft,
  ReportItemCategory,
  TuesdayOpsSeedData,
} from "@/lib/domain/types";
import { sanitizeReportText } from "@/lib/reports/sanitize";
import { buildChangeComparison, buildChangeComparisonReportItem } from "@/lib/reports/change-comparison";

type BuildReportDraftInput = {
  data: TuesdayOpsSeedData;
  clientId: string;
  periodStart: string;
  periodEnd: string;
};

export function buildReportDraft({
  data,
  clientId,
  periodStart,
  periodEnd,
}: BuildReportDraftInput): ReportDraft {
  const client = data.clients.find((candidate) => candidate.id === clientId);

  if (!client) {
    throw new Error("Client could not be found for report generation.");
  }

  const clientWorkflows = data.workflows.filter(
    (workflow) => workflow.clientId === clientId && workflow.includedInReports,
  );
  const workflowIds = new Set(clientWorkflows.map((workflow) => workflow.id));
  const checkRuns = data.checkRuns.filter(
    (run) =>
      run.clientId === clientId &&
      workflowIds.has(run.workflowId) &&
      isWithinPeriod(run.completedAt, periodStart, periodEnd),
  );
  const reportableIssues = data.issues.filter(
    (issue) =>
      issue.clientId === clientId &&
      workflowIds.has(issue.workflowId) &&
      issue.reportable,
  );
  const issuesCaught = reportableIssues.filter((issue) =>
    isWithinPeriod(issue.detectedAt, periodStart, periodEnd),
  );
  const issuesResolved = reportableIssues.filter(
    (issue) => issue.resolvedAt && isWithinPeriod(issue.resolvedAt, periodStart, periodEnd),
  );
  const testRuns = data.testRuns.filter(
    (run) => workflowIds.has(run.workflowId) && isWithinPeriod(run.createdAt, periodStart, periodEnd),
  );
  const healthyRuns = checkRuns.filter((run) => run.status === "healthy").length;
  const changeComparison = buildChangeComparison(checkRuns.map((run) => ({
    status: run.status,
    latencyMs: run.latencyMs,
    costEstimate: run.costEstimate,
    model: run.model,
    promptVersion: run.promptVersion,
    completedAt: run.completedAt,
  })));
  const passRate = checkRuns.length
    ? Math.round((healthyRuns / checkRuns.length) * 100)
    : getWorkflowAveragePassRate(clientWorkflows);
  const metrics = {
    workflowsMonitored: clientWorkflows.length,
    checksRun: checkRuns.length,
    issuesCaught: issuesCaught.length,
    issuesResolved: issuesResolved.length,
    testRuns: testRuns.length,
    testFailures: testRuns.filter((run) => run.status === "failed").length,
    passRate,
  };
  const periodLabel = formatPeriodLabel(periodStart);
  const recommendations = buildRecommendations({ issuesCaught, issuesResolved, testFailures: metrics.testFailures });
  const clientName = sanitizeReportText(client.name);

  return {
    clientId,
    clientName,
    period: periodStart.slice(0, 7),
    periodLabel,
    periodStart,
    periodEnd,
    summary: buildExecutiveSummary({
      clientName,
      periodLabel,
      metrics,
    }),
    metrics,
    recommendations,
    items: [
      buildReportItem({
        category: "workflow_health",
        title: "Workflow health overview",
        body: `${metrics.workflowsMonitored} monitored workflows completed ${metrics.checksRun} checks with a ${metrics.passRate}% pass rate.`,
        sortOrder: 10,
      }),
      buildReportItem({
        category: "issues_caught",
        title: "Issues caught",
        body: buildIssueCaughtBody(issuesCaught),
        sortOrder: 20,
      }),
      buildReportItem({
        category: "issues_resolved",
        title: "Issues resolved",
        body: buildIssueResolvedBody(issuesResolved),
        sortOrder: 30,
      }),
      buildReportItem({
        category: "qa_checks",
        title: "QA checks run",
        body: `${metrics.testRuns} synthetic test runs completed with ${metrics.testFailures} failed cases.`,
        sortOrder: 40,
      }),
      buildReportItem(buildChangeComparisonReportItem(changeComparison)),
    ],
  };
}

function buildExecutiveSummary({
  clientName,
  periodLabel,
  metrics,
}: {
  clientName: string;
  periodLabel: string;
  metrics: ReportDraft["metrics"];
}) {
  return `${periodLabel} report for ${clientName}: ${metrics.workflowsMonitored} workflows monitored, ${metrics.checksRun} checks run, ${metrics.issuesCaught} issues caught, and ${metrics.issuesResolved} issues resolved. Overall check pass rate was ${metrics.passRate}%.`;
}

function buildRecommendations({
  issuesCaught,
  issuesResolved,
  testFailures,
}: {
  issuesCaught: Issue[];
  issuesResolved: Issue[];
  testFailures: number;
}) {
  const recommendations: string[] = [];
  const openIssue = issuesCaught.find((issue) => issue.status === "open" || issue.status === "in_review");

  if (openIssue) {
    recommendations.push(`Prioritize ${sanitizeReportText(openIssue.title)} before the next client report.`);
  }

  if (testFailures > 0) {
    recommendations.push("Expand the failing synthetic test coverage into the next maintenance cycle.");
  }

  if (issuesResolved.length > 0) {
    recommendations.push("Include resolved issue notes in the client proof-of-work summary.");
  }

  if (!recommendations.length) {
    recommendations.push("Keep the current monitoring cadence and review QA coverage next month.");
  }

  return recommendations.slice(0, 3);
}

function buildIssueCaughtBody(issues: Issue[]) {
  if (!issues.length) {
    return "No reportable issues were caught during this period.";
  }

  const highestSeverity = [...issues].sort(
    (left, right) => severityRank(right.severity) - severityRank(left.severity),
  )[0];

  return `${issues.length} reportable issues were caught. Highest severity: ${highestSeverity.severity}. Notable issue: ${sanitizeReportText(highestSeverity.title)}.`;
}

function buildIssueResolvedBody(issues: Issue[]) {
  if (!issues.length) {
    return "No reportable issues were resolved during this period.";
  }

  const resolution = issues.find((issue) => issue.resolutionNote)?.resolutionNote;

  return `${issues.length} reportable issues were resolved.${resolution ? ` Latest resolution: ${sanitizeReportText(resolution)}` : ""}`;
}

function buildReportItem({
  category,
  title,
  body,
  sortOrder,
}: {
  category: ReportItemCategory;
  title: string;
  body: string;
  sortOrder: number;
}) {
  return {
    category,
    title,
    body: sanitizeReportText(body),
    sortOrder,
  };
}

function isWithinPeriod(value: string, periodStart: string, periodEnd: string) {
  const time = new Date(value).getTime();
  const start = new Date(`${periodStart}T00:00:00.000Z`).getTime();
  const end = new Date(`${periodEnd}T23:59:59.999Z`).getTime();

  return time >= start && time <= end;
}

function getWorkflowAveragePassRate(workflows: TuesdayOpsSeedData["workflows"]) {
  if (!workflows.length) {
    return 0;
  }

  return Math.round(
    workflows.reduce((total, workflow) => total + workflow.passRate, 0) / workflows.length,
  );
}

function formatPeriodLabel(periodStart: string) {
  return new Intl.DateTimeFormat("en-IE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${periodStart}T00:00:00.000Z`));
}

function severityRank(severity: Issue["severity"]): number {
  const ranks: Record<Issue["severity"], number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return ranks[severity];
}
