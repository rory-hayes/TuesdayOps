/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientsPage } from "@/components/clients/clients-page";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/billing/service", () => ({
  createCheckoutSessionAction: vi.fn(),
}));

vi.mock("@/lib/clients/service", () => ({
  archiveClientAction: vi.fn(),
  createClientAction: vi.fn(),
  updateClientAction: vi.fn(),
}));

describe("ClientsPage table controls", () => {
  afterEach(() => cleanup());

  it("filters active clients and sorts them by health", () => {
    render(<ClientsPage data={makeData()} />);

    fireEvent.change(screen.getByLabelText("Client status"), {
      target: { value: "active" },
    });
    fireEvent.change(screen.getByLabelText("Sort clients"), {
      target: { value: "health-desc" },
    });

    const clientRows = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label"))
      .filter((text) =>
        text === "Open client Acme Retail" ||
        text === "Open client Delta Finance" ||
        text === "Open client Beta Logistics"
      );

    expect(clientRows).toEqual(["Open client Delta Finance", "Open client Acme Retail"]);
    expect(screen.queryByText("Beta Logistics")).toBeNull();
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
      makeClient({
        id: "client-acme",
        name: "Acme Retail",
        healthScore: 78,
        archived: false,
      }),
      makeClient({
        id: "client-delta",
        name: "Delta Finance",
        healthScore: 94,
        archived: false,
      }),
      makeClient({
        id: "client-beta",
        name: "Beta Logistics",
        healthScore: 99,
        archived: true,
      }),
    ],
    workflows: [
      makeWorkflow({ id: "workflow-acme", clientId: "client-acme" }),
      makeWorkflow({ id: "workflow-delta", clientId: "client-delta" }),
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
    includedInReports: true,
    ...overrides,
  };
}
