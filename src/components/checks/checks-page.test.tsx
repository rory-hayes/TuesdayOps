/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChecksPage } from "@/components/checks/checks-page";
import { buildChecksPageModel } from "@/components/checks/checks-page-model";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("@/lib/checks/service", () => ({
  createCheckAction: "createCheckAction",
  disableCheckAction: "disableCheckAction",
  runCheckAction: "runCheckAction",
  updateCheckAction: "updateCheckAction",
}));

vi.mock("@/lib/test-packs/service", () => ({
  archiveTestCaseAction: "archiveTestCaseAction",
  createTestCaseAction: "createTestCaseAction",
  createTestPackAction: "createTestPackAction",
  disableTestPackAction: "disableTestPackAction",
  runTestPackAction: "runTestPackAction",
  updateTestCaseAction: "updateTestCaseAction",
  updateTestPackAction: "updateTestPackAction",
}));

describe("ChecksPage", () => {
  afterEach(() => cleanup());

  it("leads with QA coverage value before configuration controls", () => {
    const html = renderToStaticMarkup(<ChecksPage data={buildChecksFixture()} />);

    expect(html).toContain("Check coverage");
    expect(html).toContain("Workflows covered");
    expect(html).toContain("1 / 2");
    expect(html).toContain("QA runs recorded");
    expect(html).toContain("Needs attention");
    expect(html).toContain("Endpoint smoke check is failing");
    expect(html).toContain("Billing Assistant has no QA coverage");
    expect(html).toContain("Add QA coverage");
    expect(html).toContain("Add health check");
    expect(html).toContain("Configure pack, cases, and recent runs");
  });

  it("builds coverage metrics and attention items from checks and test packs", () => {
    const model = buildChecksPageModel(buildChecksFixture());

    expect(model.metrics.find((metric) => metric.label === "Workflows covered")?.value).toBe("1 / 2");
    expect(model.metrics.find((metric) => metric.label === "QA runs recorded")?.value).toBe("2");
    expect(model.metrics.find((metric) => metric.label === "Pass rate")?.value).toBe("50%");
    expect(model.attentionItems.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Endpoint smoke check is failing",
        "Billing Assistant has no QA coverage",
      ]),
    );
  });

  it("clears add-health-check required errors as corrected values become valid", () => {
    render(<ChecksPage data={buildChecksFixture()} />);

    fireEvent.click(screen.getByText("Add health check"));

    const form = screen.getByRole("form", { name: "Add health check" });
    const checkName = within(form).getByLabelText("Check name");
    const expectedStatus = within(form).getByLabelText("Expected status");
    const maxLatency = within(form).getByLabelText("Max latency ms");

    fireEvent.submit(form);

    expect(within(form).getByText("Check name is required.")).toBeTruthy();
    expect(within(form).getByText("Expected status is required.")).toBeTruthy();
    expect(within(form).getByText("Max latency ms is required.")).toBeTruthy();
    expect(checkName.getAttribute("aria-invalid")).toBe("true");
    expect(expectedStatus.getAttribute("aria-invalid")).toBe("true");
    expect(maxLatency.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(checkName, { target: { value: "Endpoint health check" } });
    fireEvent.change(expectedStatus, { target: { value: "200" } });
    fireEvent.change(maxLatency, { target: { value: "5000" } });

    expect(within(form).queryByText("Check name is required.")).toBeNull();
    expect(within(form).queryByText("Expected status is required.")).toBeNull();
    expect(within(form).queryByText("Max latency ms is required.")).toBeNull();
    expect(checkName.getAttribute("aria-invalid")).toBeNull();
    expect(expectedStatus.getAttribute("aria-invalid")).toBeNull();
    expect(maxLatency.getAttribute("aria-invalid")).toBeNull();
  });
});

function buildChecksFixture(): TuesdayOpsSeedData {
  return {
    agency: {
      id: "agency-1",
      name: "Agency",
      slug: "agency",
      primaryColor: "#18181B",
      plan: "starter",
      billingStatus: "active",
    },
    clients: [{
      id: "client-1",
      agencyId: "agency-1",
      name: "Client One",
      slug: "client-one",
      industry: "Services",
      owner: "Ops",
      reportRecipientEmail: "ops@example.com",
      reportStatus: "draft",
      reportAutomationEnabled: false,
      healthScore: 80,
      lastActivityAt: "2026-06-20T10:00:00.000Z",
      notes: "",
      archived: false,
    }],
    workflows: [
      {
        id: "workflow-covered",
        agencyId: "agency-1",
        clientId: "client-1",
        name: "Lead Intake Assistant",
        type: "webhook",
        environment: "production",
        endpointUrl: "https://example.com/lead",
        method: "GET",
        authType: "none",
        checkFrequencyMinutes: 60,
        status: "failed",
        passRate: 40,
        latencyMs: 120,
        monthlyCost: 0,
        includedInReports: true,
      },
      {
        id: "workflow-uncovered",
        agencyId: "agency-1",
        clientId: "client-1",
        name: "Billing Assistant",
        type: "http_endpoint",
        environment: "production",
        endpointUrl: "https://example.com/billing",
        method: "GET",
        authType: "none",
        checkFrequencyMinutes: 60,
        status: "unknown",
        passRate: 0,
        latencyMs: 0,
        monthlyCost: 0,
        includedInReports: true,
      },
    ],
    checks: [{
      id: "check-1",
      agencyId: "agency-1",
      workflowId: "workflow-covered",
      name: "Endpoint smoke check",
      type: "health",
      schedule: "Every 60 minutes",
      enabled: true,
      configJson: {
        timeoutMs: 10000,
        assertions: [
          { type: "status_code", expected: 200 },
          { type: "latency_under", maxMs: 5000 },
        ],
      },
      assertionCount: 2,
      latestStatus: "failed",
    }],
    checkRuns: [{
      id: "run-1",
      agencyId: "agency-1",
      clientId: "client-1",
      workflowId: "workflow-covered",
      checkId: "check-1",
      status: "failed",
      statusCode: 500,
      latencyMs: 120,
      responseSummary: "Server error",
      startedAt: "2026-06-20T09:59:59.000Z",
      completedAt: "2026-06-20T10:00:00.000Z",
    }],
    issues: [],
    testPacks: [{
      id: "pack-1",
      agencyId: "agency-1",
      workflowId: "workflow-covered",
      name: "Regression pack",
      description: "Core happy-path checks.",
      enabled: true,
      caseCount: 1,
      passRate: 100,
      lastRunAt: "2026-06-20T10:05:00.000Z",
    }],
    testCases: [{
      id: "case-1",
      agencyId: "agency-1",
      workflowId: "workflow-covered",
      testPackId: "pack-1",
      name: "Happy path",
      inputJson: { leadId: "qa-001" },
      assertionsJson: [{ type: "status_code", expected: 200 }],
      createdAt: "2026-06-20T09:00:00.000Z",
      latestStatus: "passed",
    }],
    testRuns: [{
      id: "test-run-1",
      agencyId: "agency-1",
      workflowId: "workflow-covered",
      testPackId: "pack-1",
      testCaseId: "case-1",
      status: "passed",
      statusCode: 200,
      latencyMs: 90,
      responseSummary: "OK",
      createdAt: "2026-06-20T10:05:00.000Z",
    }],
    workflowApiKeys: [],
    reports: [],
    reportItems: [],
  };
}
