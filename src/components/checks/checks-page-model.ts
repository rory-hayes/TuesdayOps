import type {
  Check,
  CheckRun,
  TestCase,
  TestPack,
  TestRun,
  TuesdayOpsSeedData,
  Workflow,
} from "@/lib/domain/types";

export type ChecksMetric = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type ChecksAttentionItem = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "danger";
  href?: string;
};

export type CheckCoverageRow = Check & {
  workflowName: string;
  workflowHref: string;
  lastRunAt?: string;
};

export type TestPackCoverageRow = TestPack & {
  workflowName: string;
  workflowHref: string;
  cases: TestCase[];
  recentRuns: TestRun[];
};

export type ChecksPageModel = {
  enabledChecks: CheckCoverageRow[];
  enabledPacks: TestPackCoverageRow[];
  attentionItems: ChecksAttentionItem[];
  metrics: ChecksMetric[];
};

export function buildChecksPageModel(data: TuesdayOpsSeedData): ChecksPageModel {
  const workflowsById = new Map(data.workflows.map((workflow) => [workflow.id, workflow]));
  const latestRunsByCheckId = getLatestRunsByCheckId(data.checkRuns);
  const enabledChecks = data.checks
    .filter((check) => check.enabled)
    .map((check) => toCheckCoverageRow(check, workflowsById, latestRunsByCheckId));
  const enabledPacks = data.testPacks
    .filter((pack) => pack.enabled)
    .map((pack) => toTestPackCoverageRow(pack, workflowsById, data.testCases, data.testRuns));
  const coveredWorkflowIds = getCoveredWorkflowIds(enabledChecks, enabledPacks);
  const uncoveredWorkflows = data.workflows.filter((workflow) => !coveredWorkflowIds.has(workflow.id));
  const totalQaRuns = data.checkRuns.length + data.testRuns.length;
  const passRate = calculateQaPassRate(data.checkRuns, data.testRuns);
  const attentionItems = buildAttentionItems({
    enabledChecks,
    enabledPacks,
    uncoveredWorkflows,
  });

  return {
    enabledChecks,
    enabledPacks,
    attentionItems,
    metrics: [
      {
        label: "Workflows covered",
        value: `${coveredWorkflowIds.size} / ${data.workflows.length}`,
        detail: "with an enabled check or runnable test pack",
        tone: uncoveredWorkflows.length ? "warning" : "success",
      },
      {
        label: "QA runs recorded",
        value: totalQaRuns.toString(),
        detail: "health checks and synthetic test runs stored",
      },
      {
        label: "Pass rate",
        value: totalQaRuns ? `${Math.round(passRate)}%` : "-",
        detail: totalQaRuns ? "across recorded QA runs" : "run checks to build evidence",
        tone: totalQaRuns && passRate < 90 ? "warning" : "success",
      },
      {
        label: "Needs attention",
        value: attentionItems.length.toString(),
        detail: attentionItems.length ? "coverage gaps or failing checks" : "no coverage blockers detected",
        tone: attentionItems.length ? "danger" : "success",
      },
    ],
  };
}

function toCheckCoverageRow(
  check: Check,
  workflowsById: Map<string, Workflow>,
  latestRunsByCheckId: Map<string, CheckRun>,
): CheckCoverageRow {
  const workflow = workflowsById.get(check.workflowId);
  const latestRun = latestRunsByCheckId.get(check.id);

  return {
    ...check,
    workflowName: workflow?.name ?? "Unknown workflow",
    workflowHref: workflow ? `/workflows/${workflow.id}` : "/workflows",
    lastRunAt: latestRun?.completedAt,
  };
}

function toTestPackCoverageRow(
  pack: TestPack,
  workflowsById: Map<string, Workflow>,
  testCases: TestCase[],
  testRuns: TestRun[],
): TestPackCoverageRow {
  const workflow = workflowsById.get(pack.workflowId);
  const cases = testCases.filter((testCase) => testCase.testPackId === pack.id);
  const recentRuns = testRuns
    .filter((run) => run.testPackId === pack.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);

  return {
    ...pack,
    workflowName: workflow?.name ?? "Unknown workflow",
    workflowHref: workflow ? `/workflows/${workflow.id}` : "/workflows",
    cases,
    recentRuns,
  };
}

function getLatestRunsByCheckId(checkRuns: CheckRun[]): Map<string, CheckRun> {
  const latestRuns = new Map<string, CheckRun>();

  for (const run of checkRuns) {
    const existing = latestRuns.get(run.checkId);

    if (!existing || new Date(run.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
      latestRuns.set(run.checkId, run);
    }
  }

  return latestRuns;
}

function getCoveredWorkflowIds(checks: CheckCoverageRow[], packs: TestPackCoverageRow[]): Set<string> {
  const coveredWorkflowIds = new Set<string>();

  for (const check of checks) {
    coveredWorkflowIds.add(check.workflowId);
  }

  for (const pack of packs) {
    if (pack.cases.length) {
      coveredWorkflowIds.add(pack.workflowId);
    }
  }

  return coveredWorkflowIds;
}

function calculateQaPassRate(checkRuns: CheckRun[], testRuns: TestRun[]): number {
  const healthRuns = checkRuns.filter((run) => run.status !== "skipped");
  const syntheticRuns = testRuns.filter((run) => run.status !== "skipped");
  const totalRuns = healthRuns.length + syntheticRuns.length;

  if (!totalRuns) {
    return 0;
  }

  const passingRuns =
    healthRuns.filter((run) => run.status === "healthy").length +
    syntheticRuns.filter((run) => run.status === "passed").length;

  return (passingRuns / totalRuns) * 100;
}

function buildAttentionItems({
  enabledChecks,
  enabledPacks,
  uncoveredWorkflows,
}: {
  enabledChecks: CheckCoverageRow[];
  enabledPacks: TestPackCoverageRow[];
  uncoveredWorkflows: Workflow[];
}): ChecksAttentionItem[] {
  const failingChecks = enabledChecks
    .filter((check) => check.latestStatus === "failed" || check.latestStatus === "degraded")
    .map((check) => ({
      id: `check-${check.id}`,
      title: check.latestStatus === "failed" ? `${check.name} is failing` : `${check.name} is degraded`,
      detail: `${check.workflowName} latest status is ${check.latestStatus}.`,
      tone: check.latestStatus === "failed" ? "danger" as const : "warning" as const,
      href: check.workflowHref,
    }));
  const neverRunChecks = enabledChecks
    .filter((check) => !check.lastRunAt)
    .map((check) => ({
      id: `check-never-run-${check.id}`,
      title: `${check.name} has not run yet`,
      detail: `${check.workflowName} needs a first run before it can prove health.`,
      tone: "warning" as const,
      href: check.workflowHref,
    }));
  const packsWithoutCases = enabledPacks
    .filter((pack) => pack.cases.length === 0)
    .map((pack) => ({
      id: `pack-no-cases-${pack.id}`,
      title: `${pack.name} has no cases`,
      detail: `${pack.workflowName} has a test pack, but nothing runnable inside it.`,
      tone: "warning" as const,
      href: pack.workflowHref,
    }));
  const packsNeverRun = enabledPacks
    .filter((pack) => pack.cases.length > 0 && !pack.recentRuns.length)
    .map((pack) => ({
      id: `pack-never-run-${pack.id}`,
      title: `${pack.name} has not run`,
      detail: `${pack.workflowName} has cases ready, but no stored synthetic run evidence.`,
      tone: "warning" as const,
      href: pack.workflowHref,
    }));
  const lowPassPacks = enabledPacks
    .filter((pack) => pack.recentRuns.length > 0 && pack.passRate < 90)
    .map((pack) => ({
      id: `pack-low-pass-${pack.id}`,
      title: `${pack.name} pass rate is ${Math.round(pack.passRate)}%`,
      detail: `${pack.workflowName} regression coverage needs review before reporting.`,
      tone: pack.passRate < 70 ? "danger" as const : "warning" as const,
      href: pack.workflowHref,
    }));
  const uncoveredItems = uncoveredWorkflows.map((workflow) => ({
    id: `workflow-uncovered-${workflow.id}`,
    title: `${workflow.name} has no QA coverage`,
    detail: "Add a health check or a runnable test pack so this workflow can produce maintenance evidence.",
    tone: "warning" as const,
    href: `/workflows/${workflow.id}`,
  }));

  return [
    ...failingChecks,
    ...neverRunChecks,
    ...packsWithoutCases,
    ...packsNeverRun,
    ...lowPassPacks,
    ...uncoveredItems,
  ];
}
