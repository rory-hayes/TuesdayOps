import type { TuesdayOpsSeedData } from "@/lib/domain/types";

export type OperationalReliabilityCheck = {
  id: "enabled_checks" | "stale_workflows" | "critical_issues" | "report_queue";
  label: string;
  status: "ready" | "attention";
  value: number;
  detail: string;
};

export type OperationalReliability = {
  ready: boolean;
  blockers: string[];
  checks: OperationalReliabilityCheck[];
};

export function buildOperationalReliability({
  data,
  now = new Date(),
}: {
  data: TuesdayOpsSeedData;
  now?: Date;
}): OperationalReliability {
  const enabledChecks = data.checks.filter((check) => check.enabled);
  const staleWorkflowCount = countStaleWorkflows({ data, now });
  const openHighRiskIssues = data.issues.filter(
    (issue) =>
      (issue.severity === "high" || issue.severity === "critical") &&
      (issue.status === "open" || issue.status === "in_review"),
  ).length;
  const readyReports = data.reports.filter((report) => report.status === "ready_to_send" || report.status === "sent").length;

  const checks: OperationalReliabilityCheck[] = [
    {
      id: "enabled_checks",
      label: "Enabled checks",
      status: enabledChecks.length > 0 ? "ready" : "attention",
      value: enabledChecks.length,
      detail: enabledChecks.length > 0
        ? `${enabledChecks.length} enabled checks can run on schedule.`
        : "No enabled health checks are configured.",
    },
    {
      id: "stale_workflows",
      label: "Stale workflows",
      status: staleWorkflowCount === 0 ? "ready" : "attention",
      value: staleWorkflowCount,
      detail: staleWorkflowCount === 0
        ? "Monitored workflows have fresh check data."
        : `${staleWorkflowCount} monitored ${pluralize("workflow", staleWorkflowCount)} ${staleWorkflowCount === 1 ? "has" : "have"} stale check data.`,
    },
    {
      id: "critical_issues",
      label: "High-risk issues",
      status: openHighRiskIssues === 0 ? "ready" : "attention",
      value: openHighRiskIssues,
      detail: openHighRiskIssues === 0
        ? "No high or critical issues are open."
        : `${openHighRiskIssues} high or critical ${pluralize("issue", openHighRiskIssues)} ${openHighRiskIssues === 1 ? "is" : "are"} still open.`,
    },
    {
      id: "report_queue",
      label: "Report queue",
      status: readyReports > 0 ? "ready" : "attention",
      value: readyReports,
      detail: readyReports > 0
        ? `${readyReports} client ${pluralize("report", readyReports)} ready or sent.`
        : "No client report is ready to send or sent.",
    },
  ];
  const blockers = checks
    .filter((check) => check.status === "attention")
    .map((check) => check.detail);

  return {
    ready: blockers.length === 0,
    blockers,
    checks,
  };
}

function countStaleWorkflows({
  data,
  now,
}: {
  data: TuesdayOpsSeedData;
  now: Date;
}): number {
  return data.workflows
    .filter((workflow) => workflow.includedInReports)
    .filter((workflow) => {
      const lastCheckAt = new Date(workflow.lastCheckAt).getTime();
      const freshnessWindowMs = workflow.checkFrequencyMinutes * 2 * 60 * 1000;

      return Number.isNaN(lastCheckAt) || now.getTime() - lastCheckAt > freshnessWindowMs;
    }).length;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
