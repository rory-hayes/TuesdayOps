import type {
  Issue,
  PortfolioSummary,
  ReportSummary,
  TuesdayOpsSeedData,
  WorkflowHealthRow,
} from "./types";

export function getPortfolioSummary(data: TuesdayOpsSeedData): PortfolioSummary {
  const activeClients = data.clients.filter((client) => !client.archived).length;
  const monitoredWorkflows = data.workflows.filter((workflow) => workflow.includedInReports).length;
  const openIssues = getOpenIssues(data).length;
  const workflowsWithPassRates = data.workflows.filter((workflow) => workflow.includedInReports);
  const passRateTotal = workflowsWithPassRates.reduce((total, workflow) => total + workflow.passRate, 0);

  return {
    activeClients,
    monitoredWorkflows,
    openIssues,
    checkPassRate: workflowsWithPassRates.length
      ? Math.round(passRateTotal / workflowsWithPassRates.length)
      : 0,
  };
}

export function getOpenIssues(data: TuesdayOpsSeedData): Issue[] {
  return data.issues
    .filter((issue) => issue.reportable)
    .filter((issue) => issue.status === "open" || issue.status === "in_review")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

export function getReportSummary(
  data: TuesdayOpsSeedData,
  clientId: string,
  period: string,
): ReportSummary {
  const report = data.reports.find(
    (candidate) => candidate.clientId === clientId && candidate.period === period,
  );

  if (!report) {
    throw new Error(`No report summary found for client ${clientId} in ${period}.`);
  }

  return report;
}

export function getWorkflowHealthRows(data: TuesdayOpsSeedData): WorkflowHealthRow[] {
  return data.workflows.map((workflow) => {
    const client = data.clients.find((candidate) => candidate.id === workflow.clientId);
    const openIssues = data.issues.filter(
      (issue) =>
        issue.workflowId === workflow.id &&
        issue.reportable &&
        (issue.status === "open" || issue.status === "in_review"),
    ).length;

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      clientName: client?.name ?? "Unknown client",
      status: workflow.status,
      passRate: workflow.passRate,
      latencyMs: workflow.latencyMs,
      lastCheckAt: workflow.lastCheckAt,
      openIssues,
      includedInReports: workflow.includedInReports,
    };
  });
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
