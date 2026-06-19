/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowsPage } from "@/components/workflows/workflows-page";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("@/lib/billing/service", () => ({
  createCheckoutSessionAction: vi.fn(),
}));

vi.mock("@/lib/checks/service", () => ({
  runCheckAction: vi.fn(),
}));

vi.mock("@/lib/workflows/service", () => ({
  createWorkflowAction: vi.fn(),
  createWorkflowFromImportAction: vi.fn(),
}));

describe("WorkflowsPage table controls", () => {
  afterEach(() => cleanup());

  it("searches workflows, filters unhealthy rows, and sorts by pass rate", () => {
    render(<WorkflowsPage data={makeData()} />);

    fireEvent.change(screen.getByLabelText("Search workflows"), {
      target: { value: "api" },
    });
    fireEvent.change(screen.getByLabelText("Workflow status"), {
      target: { value: "attention" },
    });
    fireEvent.change(screen.getByLabelText("Sort workflows"), {
      target: { value: "pass-rate-asc" },
    });

    const workflowLinks = screen
      .getAllByRole("link")
      .map((link) => link.textContent)
      .filter((text) => text === "Lead intake" || text === "Invoice sync" || text === "Support bot");

    expect(workflowLinks).toEqual(["Invoice sync", "Support bot"]);
    expect(screen.queryByText("Lead intake")).toBeNull();
  });
});

function makeData(): TuesdayOpsSeedData {
  return {
    agency: {
      id: "agency-1",
      name: "Tuesday Ops",
      slug: "tuesday-ops",
      primaryColor: "#18181b",
      plan: "starter",
      billingStatus: "trialing",
    },
    clients: [
      makeClient({ id: "client-acme", name: "Acme Retail" }),
      makeClient({ id: "client-beta", name: "Beta Logistics" }),
    ],
    workflows: [
      makeWorkflow({
        id: "workflow-lead",
        clientId: "client-acme",
        name: "Lead intake",
        endpointUrl: "https://example.com/api/lead",
        status: "healthy",
        passRate: 99,
      }),
      makeWorkflow({
        id: "workflow-invoice",
        clientId: "client-beta",
        name: "Invoice sync",
        endpointUrl: "https://example.com/api/invoices",
        status: "failed",
        passRate: 48,
      }),
      makeWorkflow({
        id: "workflow-support",
        clientId: "client-acme",
        name: "Support bot",
        endpointUrl: "https://example.com/api/support",
        status: "degraded",
        passRate: 72,
      }),
    ],
    checks: [],
    checkRuns: [],
    issues: [],
    testPacks: [],
    testCases: [],
    testRuns: [],
    workflowApiKeys: [],
    reports: [],
    reportItems: [],
  };
}

function makeClient(
  overrides: Partial<TuesdayOpsSeedData["clients"][number]>,
): TuesdayOpsSeedData["clients"][number] {
  return {
    id: "client-1",
    agencyId: "agency-1",
    name: "Client",
    slug: "client",
    industry: "Operations",
    owner: "Delivery",
    reportRecipientEmail: "ops@example.invalid",
    reportStatus: "draft",
    reportAutomationEnabled: false,
    healthScore: 80,
    lastActivityAt: "2026-06-18T10:00:00.000Z",
    notes: "",
    archived: false,
    ...overrides,
  };
}

function makeWorkflow(
  overrides: Partial<TuesdayOpsSeedData["workflows"][number]>,
): TuesdayOpsSeedData["workflows"][number] {
  return {
    id: "workflow-1",
    agencyId: "agency-1",
    clientId: "client-1",
    name: "Workflow",
    type: "http_endpoint",
    environment: "production",
    endpointUrl: "https://example.com/api/health",
    method: "GET",
    authType: "none",
    checkFrequencyMinutes: 60,
    status: "healthy",
    passRate: 100,
    latencyMs: 120,
    monthlyCost: 0,
    includedInReports: true,
    ...overrides,
  };
}
