/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChecksPage } from "@/components/checks/checks-page";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("@/lib/checks/service", () => ({
  createCheckAction: vi.fn(),
  disableCheckAction: vi.fn(),
  runCheckAction: vi.fn(),
  updateCheckAction: vi.fn(),
}));

vi.mock("@/lib/test-packs/service", () => ({
  archiveTestCaseAction: vi.fn(),
  createTestCaseAction: vi.fn(),
  createTestPackAction: vi.fn(),
  disableTestPackAction: vi.fn(),
  runTestPackAction: vi.fn(),
  updateTestCaseAction: vi.fn(),
  updateTestPackAction: vi.fn(),
}));

describe("ChecksPage", () => {
  afterEach(() => cleanup());

  it("keeps health-check forms in Basic mode until advanced settings are expanded", () => {
    render(<ChecksPage data={data} />);

    const createBasic = screen.getByRole("group", { name: "Basic settings for new health check" });
    expect(within(createBasic).getByLabelText("Workflow")).toBeTruthy();
    expect(within(createBasic).getByLabelText("Check name")).toBeTruthy();
    expect(within(createBasic).getByLabelText("Expected status")).toBeTruthy();
    expect(within(createBasic).getByLabelText("Max latency ms")).toBeTruthy();

    const createAdvanced = screen.getAllByText("Advanced settings")[0]?.closest("details");
    expect(createAdvanced).toBeTruthy();
    expect((createAdvanced as HTMLDetailsElement).open).toBe(false);
    const createTimeout = within(createAdvanced as HTMLElement).getByLabelText("Timeout ms") as HTMLInputElement;
    expect(createTimeout.value).toBe("10000");
    expect(createTimeout.required).toBe(false);
    expect(within(createAdvanced as HTMLElement).getByText("Stop waiting after this many milliseconds.")).toBeTruthy();

    fireEvent.click(within(createAdvanced as HTMLElement).getByText("Advanced settings"));

    expect((createAdvanced as HTMLDetailsElement).open).toBe(true);

    const editSettings = screen.getByText("Edit check settings").closest("details");
    expect(editSettings).toBeTruthy();
    const editBasic = within(editSettings as HTMLElement).getByRole("group", {
      name: "Basic settings for Endpoint health check",
    });
    expect(within(editBasic).getByLabelText("Check name")).toBeTruthy();
    expect(within(editBasic).getByLabelText("Expected status")).toBeTruthy();
    expect(within(editBasic).getByLabelText("Max latency ms")).toBeTruthy();

    const editAdvanced = within(editSettings as HTMLElement).getByText("Advanced settings").closest("details");
    expect(editAdvanced).toBeTruthy();
    expect((editAdvanced as HTMLDetailsElement).open).toBe(false);
    expect(within(editAdvanced as HTMLElement).getByLabelText("Request body")).toBeTruthy();
    expect(within(editAdvanced as HTMLElement).getByText("Optional JSON payload for POST, PUT, or PATCH workflows.")).toBeTruthy();
  });
});

const data: TuesdayOpsSeedData = {
  agency: {
    id: "agency-1",
    name: "Tuesday Ops",
    slug: "tuesday-ops",
    primaryColor: "#18181b",
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
      reportAutomationEnabled: false,
      healthScore: 86,
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
      status: "healthy",
      passRate: 98,
      latencyMs: 240,
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
      configJson: {
        timeoutMs: 12000,
        requestBody: "{\"ping\":true}",
        assertions: [
          { type: "status_code", expected: 202 },
          { type: "latency_under", maxMs: 3000 },
          { type: "contains_text", value: "accepted" },
          { type: "field_exists", path: "result.id" },
          { type: "field_not_empty", path: "result.answer" },
          { type: "matches_regex", pattern: "case-[0-9]+" },
          { type: "not_contains", value: "error" },
        ],
      },
      assertionCount: 7,
      latestStatus: "healthy",
    },
  ],
  checkRuns: [],
  issues: [],
  testPacks: [],
  testCases: [],
  testRuns: [],
  workflowApiKeys: [],
  reports: [],
  reportItems: [],
};
