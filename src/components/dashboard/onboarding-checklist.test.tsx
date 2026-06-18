import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

describe("OnboardingChecklist", () => {
  it("renders the activation path before the first proof loop is complete", () => {
    const html = renderToStaticMarkup(<OnboardingChecklist data={makeData()} />);

    expect(html).toContain("Activation path");
    expect(html).toContain("Set up your first workflow proof");
    expect(html).toContain("Add first client");
  });

  it("hides the activation path after the first proof loop is complete", () => {
    const html = renderToStaticMarkup(
      <OnboardingChecklist
        data={makeData({
          clients: [makeClient()],
          workflows: [makeWorkflow()],
          checkRuns: [makeCheckRun()],
          reports: [makeReport()],
        })}
      />,
    );

    expect(html).toBe("");
    expect(html).not.toContain("Activation path");
    expect(html).not.toContain("Proof loop ready");
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
      primaryColor: "#18181b",
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
    workflowApiKeys: [],
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
    owner: "Ops",
    reportRecipientEmail: "ops@example.invalid",
    reportStatus: "draft",
    reportAutomationEnabled: false,
    healthScore: 100,
    lastActivityAt: "2026-06-18T12:00:00.000Z",
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
    latencyMs: 120,
    monthlyCost: 0,
    lastCheckAt: "2026-06-18T12:00:00.000Z",
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
    latencyMs: 120,
    responseSummary: "ok",
    startedAt: "2026-06-18T12:00:00.000Z",
    completedAt: "2026-06-18T12:00:01.000Z",
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
