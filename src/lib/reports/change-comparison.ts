import type { CheckRunStatus, ReportDraft } from "@/lib/domain/types";

export type ChangeComparisonRun = {
  status: CheckRunStatus;
  latencyMs: number;
  costEstimate?: number;
  model?: string;
  promptVersion?: string;
  completedAt: string;
};

export type ChangeComparisonGroup = {
  label: string;
  model?: string;
  promptVersion?: string;
  runs: number;
  passRate: number;
  averageLatencyMs: number;
  averageCostEstimate?: number;
  latestRunAt: string;
};

export type ChangeComparison = {
  groups: ChangeComparisonGroup[];
};

export function buildChangeComparison(runs: ChangeComparisonRun[]): ChangeComparison {
  const grouped = new Map<string, ChangeComparisonRun[]>();

  for (const run of runs) {
    if (!run.model && !run.promptVersion) {
      continue;
    }

    const label = buildLabel(run);
    grouped.set(label, [...(grouped.get(label) ?? []), run]);
  }

  const groups = [...grouped.entries()]
    .map(([label, items]) => buildGroup(label, items))
    .sort((left, right) => new Date(right.latestRunAt).getTime() - new Date(left.latestRunAt).getTime());

  return { groups };
}

export function buildChangeComparisonReportItem(
  comparison: ChangeComparison,
): ReportDraft["items"][number] {
  const latest = comparison.groups[0];

  if (!latest) {
    return {
      category: "model_prompt_changes",
      title: "Model/prompt changes tested",
      body: "No model or prompt version metadata was logged during this period.",
      sortOrder: 50,
    };
  }

  return {
    category: "model_prompt_changes",
    title: "Model/prompt changes tested",
    body: `${comparison.groups.length} ${pluralize("change validation group", comparison.groups.length)} logged. Latest ${latest.label}: ${latest.passRate}% pass rate, ${latest.averageLatencyMs}ms average latency${latest.averageCostEstimate === undefined ? "." : `, ${latest.averageCostEstimate} average cost.`}`,
    sortOrder: 50,
  };
}

function buildGroup(label: string, runs: ChangeComparisonRun[]): ChangeComparisonGroup {
  const passed = runs.filter((run) => run.status === "healthy").length;
  const costRuns = runs.filter((run) => typeof run.costEstimate === "number");
  const latestRunAt = runs
    .map((run) => run.completedAt)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  const first = runs[0];

  return {
    label,
    model: first.model,
    promptVersion: first.promptVersion,
    runs: runs.length,
    passRate: Math.round((passed / runs.length) * 100),
    averageLatencyMs: Math.round(average(runs.map((run) => run.latencyMs))),
    averageCostEstimate: costRuns.length ? roundCost(average(costRuns.map((run) => run.costEstimate ?? 0))) : undefined,
    latestRunAt,
  };
}

function buildLabel(run: ChangeComparisonRun): string {
  return `${run.model ?? "unknown model"} / ${run.promptVersion ?? "unversioned prompt"}`;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundCost(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
