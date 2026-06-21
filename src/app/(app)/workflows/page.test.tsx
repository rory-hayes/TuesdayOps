/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import WorkflowDetailRoute from "./[workflowId]/page";
import WorkflowsRoute from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth/workspace", () => ({
  requireWorkspace: vi.fn(),
}));

vi.mock("@/lib/data/operational-data", () => ({
  getOperationalData: vi.fn(),
}));

vi.mock("@/lib/billing/service", () => ({
  createCheckoutSessionAction: vi.fn(),
  requestAgencyPlusContactAction: vi.fn(),
}));

vi.mock("@/lib/checks/service", () => ({
  createCheckAction: vi.fn(),
  runCheckAction: vi.fn(),
  updateCheckAction: vi.fn(),
}));

vi.mock("@/lib/workflows/service", () => ({
  archiveWorkflowAction: vi.fn(),
  createWorkflowAction: vi.fn(),
  createWorkflowFromImportAction: vi.fn(),
  updateWorkflowAction: vi.fn(),
}));

const workflowAddedNotice = "Workflow added. Run its first check when ready.";

describe("workflow routes", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders notice query feedback on the workflows list route", async () => {
    mockRouteData(makeData());

    render(
      await WorkflowsRoute({
        searchParams: Promise.resolve({ notice: workflowAddedNotice }),
      }),
    );

    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain(workflowAddedNotice);
    expect(document.querySelector(".toast-notification")).toBeNull();
  });

  it("renders notice query feedback on the workflow detail route", async () => {
    mockRouteData(makeData());

    render(
      await WorkflowDetailRoute({
        params: Promise.resolve({ workflowId: "workflow-lead" }),
        searchParams: Promise.resolve({ notice: workflowAddedNotice }),
      }),
    );

    expect(screen.getByRole("heading", { name: "Lead intake" })).toBeTruthy();
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain(workflowAddedNotice);
    expect(document.querySelector(".toast-notification")).toBeNull();
  });
});

function mockRouteData(data: TuesdayOpsSeedData) {
  vi.mocked(requireWorkspace).mockResolvedValue({
    user: { id: "user-1" },
    role: "owner",
    agency: data.agency,
  } as never);
  vi.mocked(getOperationalData).mockResolvedValue(data);
}

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
      {
        id: "client-acme",
        agencyId: "agency-1",
        name: "Acme Retail",
        slug: "acme-retail",
        industry: "Retail",
        owner: "Ops",
        reportRecipientEmail: "ops@example.invalid",
        reportStatus: "draft",
        reportAutomationEnabled: false,
        healthScore: 82,
        lastActivityAt: "2026-06-18T10:00:00.000Z",
        notes: "",
        archived: false,
      },
    ],
    workflows: [
      {
        id: "workflow-lead",
        agencyId: "agency-1",
        clientId: "client-acme",
        name: "Lead intake",
        type: "http_endpoint",
        environment: "production",
        endpointUrl: "https://example.com/api/lead",
        method: "POST",
        authType: "none",
        checkFrequencyMinutes: 60,
        status: "healthy",
        passRate: 99,
        latencyMs: 180,
        monthlyCost: 0,
        includedInReports: true,
      },
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
