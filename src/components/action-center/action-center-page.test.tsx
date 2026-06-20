/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionCenterPage, getActionCenterTab } from "@/components/action-center/action-center-page";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ActionCenterPage", () => {
  afterEach(() => cleanup());

  it("uses workflow-style nav tabs and renders the selected stream", () => {
    render(<ActionCenterPage data={data} activeTab="runs" />);

    expect(screen.getByRole("heading", { name: "Action center" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Runs, 1 item" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("The latest stored endpoint results across monitored workflows.")).toBeTruthy();
    expect(screen.getByText("Lead intake")).toBeTruthy();
  });

  it("renders the readiness tab from operational reliability checks", () => {
    render(<ActionCenterPage data={data} activeTab="readiness" />);

    expect(screen.getByRole("link", { name: "Readiness, 3 items" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("High-risk issues")).toBeTruthy();
  });

  it("falls back to issues for unknown tab values", () => {
    expect(getActionCenterTab("nope")).toBe("issues");
  });
});

const data: TuesdayOpsSeedData = {
  agency: {
    id: "agency-1",
    name: "Tuesday Ops",
    slug: "tuesday-ops",
    primaryColor: "#6f5cf6",
    plan: "starter",
    billingStatus: "active",
  },
  clients: [
    {
      id: "client-1",
      agencyId: "agency-1",
      name: "Acme",
      slug: "acme",
      industry: "Services",
      owner: "Ops",
      reportRecipientEmail: "ops@example.com",
      reportStatus: "draft",
      reportAutomationEnabled: true,
      nextReportDueOn: "2026-06-01",
      healthScore: 82,
      lastActivityAt: "2026-06-18T10:00:00.000Z",
      notes: "",
      archived: false,
    },
  ],
  workflows: [
    {
      id: "workflow-1",
      agencyId: "agency-1",
      clientId: "client-1",
      name: "Lead intake",
      type: "http_endpoint",
      environment: "production",
      endpointUrl: "https://example.com/lead",
      method: "POST",
      authType: "none",
      checkFrequencyMinutes: 60,
      status: "failed",
      passRate: 64,
      latencyMs: 420,
      monthlyCost: 0,
      includedInReports: true,
    },
  ],
  checks: [
    {
      id: "check-1",
      agencyId: "agency-1",
      workflowId: "workflow-1",
      name: "Endpoint health check",
      type: "health",
      schedule: "Every 60 minutes",
      enabled: true,
      configJson: {},
      assertionCount: 2,
      latestStatus: "failed",
    },
  ],
  checkRuns: [
    {
      id: "run-1",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      checkId: "check-1",
      status: "failed",
      statusCode: 500,
      latencyMs: 420,
      responseSummary: "Server error",
      startedAt: "2026-06-18T10:00:00.000Z",
      completedAt: "2026-06-18T10:00:01.000Z",
    },
  ],
  issues: [
    {
      id: "issue-1",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-1",
      checkRunId: "run-1",
      severity: "high",
      status: "open",
      title: "Lead intake returned HTTP 500",
      description: "The workflow failed.",
      suggestedAction: "Review credentials and rerun the check.",
      owner: "Unassigned",
      reportable: true,
      occurrenceCount: 1,
      detectedAt: "2026-06-18T10:00:01.000Z",
      lastSeenAt: "2026-06-18T10:00:01.000Z",
    },
  ],
  testPacks: [],
  testCases: [],
  testRuns: [],
  workflowApiKeys: [],
  reports: [],
  reportItems: [],
};
