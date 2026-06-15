import type { ReportSummary, TuesdayOpsSeedData } from "@/lib/domain/types";

export type ReportQualityCheck = {
  id: "source_data" | "sections" | "recommendations" | "open_risk";
  label: string;
  status: "ready" | "warning" | "blocked";
  detail: string;
};

export type ReportQuality = {
  status: "ready" | "review" | "blocked";
  score: number;
  blockers: string[];
  warnings: string[];
  checks: ReportQualityCheck[];
};

export function buildReportQuality({
  data,
  reportId,
}: {
  data: TuesdayOpsSeedData;
  reportId?: string;
}): ReportQuality {
  const report = reportId
    ? data.reports.find((candidate) => candidate.id === reportId)
    : data.reports[0];

  if (!report) {
    return {
      status: "blocked",
      score: 0,
      blockers: ["Generate a report before export or send review."],
      warnings: [],
      checks: [
        {
          id: "source_data",
          label: "Source data",
          status: "blocked",
          detail: "Generate a report before export or send review.",
        },
      ],
    };
  }

  const reportItems = data.reportItems.filter((item) => item.reportId === report.id);
  const openHighRiskIssues = countOpenHighRiskIssues(data, report);
  const checks: ReportQualityCheck[] = [
    {
      id: "source_data",
      label: "Source data",
      status: report.workflowsMonitored > 0 && report.checksRun > 0 ? "ready" : "blocked",
      detail: report.checksRun > 0
        ? `${report.checksRun} checks from ${report.workflowsMonitored} monitored workflows.`
        : "Report has no check runs for this period.",
    },
    {
      id: "sections",
      label: "Report sections",
      status: reportItems.length > 0 ? "ready" : "blocked",
      detail: reportItems.length > 0
        ? `${reportItems.length} report sections are ready.`
        : "Report has no saved report sections.",
    },
    {
      id: "recommendations",
      label: "Recommendations",
      status: report.recommendations.length > 0 ? "ready" : "warning",
      detail: report.recommendations.length > 0
        ? `${report.recommendations.length} client-safe recommendations included.`
        : "Report has no client-safe recommendations.",
    },
    {
      id: "open_risk",
      label: "Open high-risk issues",
      status: openHighRiskIssues === 0 ? "ready" : "warning",
      detail: openHighRiskIssues === 0
        ? "No high or critical issues are still open for this client."
        : `${openHighRiskIssues} high or critical ${pluralize("issue", openHighRiskIssues)} ${openHighRiskIssues === 1 ? "is" : "are"} still open for this client.`,
    },
  ];
  const blockers = checks.filter((check) => check.status === "blocked").map((check) => check.detail);
  const warnings = checks.filter((check) => check.status === "warning").map((check) => check.detail);
  const score = Math.max(0, 100 - blockers.length * 35 - warnings.length * 15);

  return {
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "review" : "ready",
    score,
    blockers,
    warnings,
    checks,
  };
}

export function assertReportCanBeExported(quality: ReportQuality): void {
  if (quality.status !== "blocked") {
    return;
  }

  const reason = quality.blockers[0] ?? "Resolve blocked report readiness items before export or send.";
  throw new Error(`Report is blocked: ${reason}`);
}

function countOpenHighRiskIssues(data: TuesdayOpsSeedData, report: ReportSummary): number {
  return data.issues.filter(
    (issue) =>
      issue.clientId === report.clientId &&
      issue.reportable &&
      (issue.severity === "high" || issue.severity === "critical") &&
      (issue.status === "open" || issue.status === "in_review"),
  ).length;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
