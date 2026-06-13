import { describe, expect, it } from "vitest";
import { buildOnboardingProgress } from "@/lib/onboarding/progress";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

describe("buildOnboardingProgress", () => {
  it("points a new agency at the first client step", () => {
    const progress = buildOnboardingProgress(makeData());

    expect(progress.completedCount).toBe(1);
    expect(progress.totalCount).toBe(5);
    expect(progress.percent).toBe(20);
    expect(progress.nextStep?.id).toBe("client");
    expect(progress.steps.map((step) => [step.id, step.complete])).toEqual([
      ["agency", true],
      ["client", false],
      ["workflow", false],
      ["check_run", false],
      ["report", false],
    ]);
  });

  it("marks activation complete when the core proof loop has data", () => {
    const progress = buildOnboardingProgress(
      makeData({
        clients: [makeClient()],
        workflows: [makeWorkflow()],
        checkRuns: [makeCheckRun()],
        reports: [makeReport()],
      }),
    );

    expect(progress.completedCount).toBe(5);
    expect(progress.percent).toBe(100);
    expect(progress.nextStep).toBeUndefined();
    expect(progress.complete).toBe(true);
  });
});

function makeData(
  overrides: Partial<Pick<TuesdayOpsSeedData, "clients" | "workflows" | "checkRuns" | "reports">> = {},
): TuesdayOpsSeedData {
  return {
    agency: {
      id: "agency-1",
      name: "Northstar Automation",
      slug: "northstar",
      primaryColor: "#7C6CF2",
      plan: "starter",
      billingStatus: "trialing",
    },
    clients: [],
    workflows: [],
    checks: [],
    checkRuns: [],
    issues: [],
    testPacks: [],
    testCases: [],
    testRuns: [],
    reports: [],
    reportItems: [],
    ...overrides,
  } as TuesdayOpsSeedData;
}

function makeClient(): TuesdayOpsSeedData["clients"][number] {
  return {
    id: "client-1",
    agencyId: "agency-1",
    name: "Acme",
    slug: "acme",
    industry: "Services",
    owner: "Unassigned",
    reportRecipientEmail: "ops@example.invalid",
    reportStatus: "draft",
    healthScore: 100,
    lastActivityAt: "2026-06-13T12:00:00.000Z",
    notes: "",
    archived: false,
  };
}

function makeWorkflow(): TuesdayOpsSeedData["workflows"][number] {
  return {
    id: "workflow-1",
    agencyId: "agency-1",
    clientId: "client-1",
    name: "Lead intake",
    type: "http_endpoint",
    environment: "production",
    endpointUrl: "https://example.com/health",
    method: "GET",
    authType: "none",
    checkFrequencyMinutes: 60,
    status: "healthy",
    passRate: 100,
    latencyMs: 400,
    monthlyCost: 0,
    lastCheckAt: "2026-06-13T12:00:00.000Z",
    includedInReports: true,
  };
}

function makeCheckRun(): TuesdayOpsSeedData["checkRuns"][number] {
  return {
    id: "run-1",
    agencyId: "agency-1",
    clientId: "client-1",
    workflowId: "workflow-1",
    checkId: "check-1",
    status: "healthy",
    statusCode: 200,
    latencyMs: 400,
    responseSummary: "ok",
    startedAt: "2026-06-13T12:00:00.000Z",
    completedAt: "2026-06-13T12:00:00.000Z",
  };
}

function makeReport(): TuesdayOpsSeedData["reports"][number] {
  return {
    id: "report-1",
    agencyId: "agency-1",
    clientId: "client-1",
    clientName: "Acme",
    period: "2026-06",
    periodLabel: "June 2026",
    status: "draft",
    checksRun: 1,
    issuesCaught: 0,
    issuesResolved: 0,
    workflowsMonitored: 1,
    passRate: 100,
    summary: "Report ready",
    recommendations: [],
  };
}
