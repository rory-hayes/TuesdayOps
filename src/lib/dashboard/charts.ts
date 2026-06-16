import type { CheckRunStatus, IssueSeverity, IssueStatus } from "@/lib/domain/types";

export type ChartPoint = {
  label: string;
  value: number;
};

export function buildPassRateTrend(
  runs: Array<{ status: CheckRunStatus; completedAt: string }>,
): ChartPoint[] {
  return groupByDay(runs, (items) => {
    const completed = items.filter((run) => run.status !== "skipped");
    const healthy = completed.filter((run) => run.status === "healthy").length;

    return completed.length ? Math.round((healthy / completed.length) * 100) : 0;
  });
}

export function buildChecksRunSeries(
  runs: Array<{ completedAt: string }>,
): ChartPoint[] {
  return groupByDay(runs, (items) => items.length);
}

export function buildIssuesBySeveritySeries(
  issues: Array<{ severity: IssueSeverity; status: IssueStatus }>,
): ChartPoint[] {
  const activeIssues = issues.filter((issue) => issue.status === "open" || issue.status === "in_review");
  const counts: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const issue of activeIssues) {
    counts[issue.severity] += 1;
  }

  return [
    { label: "Critical", value: counts.critical },
    { label: "High", value: counts.high },
    { label: "Medium", value: counts.medium },
    { label: "Low", value: counts.low },
  ];
}

function groupByDay<T extends { completedAt: string }>(
  items: T[],
  getValue: (items: T[]) => number,
): ChartPoint[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = item.completedAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, rows]) => ({
      label: formatChartDate(date),
      value: getValue(rows),
    }));
}

function formatChartDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
