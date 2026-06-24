/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("@/lib/onboarding/actions", () => ({
  createActivationClientAction: vi.fn(async () => null),
  createActivationWorkflowAction: vi.fn(async () => null),
  createActivationWorkflowImportAction: vi.fn(async () => null),
  runActivationCheckAction: vi.fn(async () => null),
  generateActivationReportAction: vi.fn(async () => null),
}));

describe("OnboardingChecklist activation wizard", () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("auto-opens the activation path wizard while setup is incomplete", async () => {
    render(<OnboardingChecklist data={makeData()} />);

    expect(screen.getByRole("button", { name: "Finish first setup" })).toBeTruthy();
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Add the client" })).toBeTruthy();
    expect(screen.getByLabelText("Client name")).toBeTruthy();
  });

  it("persists skip so the modal no longer opens automatically", async () => {
    render(<OnboardingChecklist data={makeData()} />);

    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.localStorage.getItem("tuesdayops:activation-wizard-skipped:agency-1")).toBe("true");
    expect(screen.queryByRole("button", { name: "Finish first setup" })).toBeNull();
  });

  it("uses neutral workflow name guidance instead of a specific assistant example", async () => {
    render(<OnboardingChecklist data={makeData({ clients: [makeClient()] })} />);

    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Manual/i }));

    const workflowName = screen.getByLabelText("Workflow name") as HTMLInputElement;

    expect(workflowName.placeholder).toBe("e.g. client workflow endpoint");
    expect(workflowName.placeholder).not.toBe("Lead Intake Assistant");
  });

  it("keeps the wizard body in a mouse-wheel scroll region", async () => {
    render(<OnboardingChecklist data={makeData({ clients: [makeClient()] })} />);

    const dialog = await screen.findByRole("dialog");
    const scrollRegion = within(dialog).getByRole("region", { name: "Activation wizard content" });
    const panel = scrollRegion.closest("section")?.parentElement;
    const contentSection = scrollRegion.closest("section");

    expect(panel?.className).toContain("h-[calc(100dvh-2rem)]");
    expect(panel?.className).toContain("grid-rows-[minmax(0,1fr)]");
    expect(panel?.className).toContain("sm:h-[calc(100dvh-4rem)]");
    expect(panel?.className).toContain("sm:max-h-[900px]");
    expect(contentSection?.className).toContain("h-full");
    expect(contentSection?.className).toContain("overflow-hidden");
    expect(scrollRegion.className).toContain("overflow-y-auto");
    expect(scrollRegion.className).toContain("overscroll-contain");
    expect(scrollRegion.getAttribute("tabindex")).toBeNull();
  });

  it("points users to the Reports section after a report is generated", async () => {
    render(
      <OnboardingChecklist
        data={makeData({
          clients: [makeClient()],
          workflows: [makeWorkflow()],
          checks: [makeCheck()],
          reports: [makeReport()],
        })}
      />,
    );

    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "5. Report" }));

    expect(within(dialog).getByText(/manage future drafts from the Reports section/i)).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: /Open report preview/i }).getAttribute("href")).toBe(
      "/reports/report-1",
    );
    expect(within(dialog).getByRole("link", { name: /Go to Reports section/i }).getAttribute("href")).toBe(
      "/reports",
    );
  });

  it("does not render setup prompts after the proof loop is complete", () => {
    render(
      <OnboardingChecklist
        data={makeData({
          clients: [makeClient()],
          workflows: [makeWorkflow()],
          checks: [makeCheck()],
          checkRuns: [makeCheckRun()],
          reports: [makeReport()],
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Finish first setup" })).toBeNull();
    expect(screen.queryByText("Activation path")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

function installLocalStorageMock() {
  const values = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
}

function makeData(
  overrides: Partial<Pick<TuesdayOpsSeedData, "clients" | "workflows" | "checks" | "checkRuns" | "reports">> = {},
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

function makeCheck(): TuesdayOpsSeedData["checks"][number] {
  return {
    id: "check-1",
    agencyId: "agency-1",
    workflowId: "workflow-1",
    name: "Endpoint health check",
    type: "health",
    schedule: "Every 60 minutes",
    enabled: true,
    configJson: {},
    assertionCount: 2,
    latestStatus: "healthy",
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
