import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkflowDetailPage } from "@/components/workflows/workflow-detail-page";
import type { TuesdayOpsSeedData, Workflow } from "@/lib/domain/types";

vi.mock("@/lib/checks/service", () => ({
  createCheckAction: "createCheckAction",
  runCheckAction: "runCheckAction",
  updateCheckAction: "updateCheckAction",
}));

vi.mock("@/lib/workflows/service", () => ({
  archiveWorkflowAction: "archiveWorkflowAction",
  updateWorkflowAction: "updateWorkflowAction",
}));

describe("WorkflowDetailPage maintenance UI", () => {
  it("renders compact editable workflow settings without exposing saved secrets", () => {
    const { data, workflow } = buildWorkflowDetailFixture();

    const html = renderToStaticMarkup(
      <WorkflowDetailPage data={data} workflow={workflow} activeTab="settings" />,
    );

    expect(html).toContain("https://api.example.com/v1/Lead%20Router?signature=a%2Fb&amp;next=%2Fcallback");
    expect(html).toContain('name="endpointUrl"');
    expect(html).toContain('value="https://api.example.com/v1/Lead%20Router?signature=a%2Fb&amp;next=%2Fcallback"');
    expect(html).toContain('name="authSecret"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain("existing-secret");
    expect(html).toContain('name="expectedStatus"');
    expect(html).toContain('value="202"');
    expect(html).toContain('name="timeoutMs"');
    expect(html).toContain('value="12000"');
    expect(html).toContain('href="/workflows/workflow-maintenance"');
    expect(html).toContain("Cancel");
  });

  it("keeps check edit validation anchored to the workflow tab", () => {
    const { data, workflow } = buildWorkflowDetailFixture();

    const html = renderToStaticMarkup(
      <WorkflowDetailPage data={data} workflow={workflow} activeTab="checks" />,
    );

    expect(html).toContain('name="workflowId"');
    expect(html).toContain('value="workflow-maintenance"');
    expect(html).toContain('name="returnTab"');
    expect(html).toContain('value="checks"');
  });
});

function buildWorkflowDetailFixture(): {
  data: TuesdayOpsSeedData;
  workflow: Workflow;
} {
  const workflow: Workflow = {
    id: "workflow-maintenance",
    agencyId: "agency-1",
    clientId: "client-1",
    name: "Lead Router",
    type: "custom_api",
    environment: "staging",
    endpointUrl: "https://api.example.com/v1/Lead%20Router?signature=a%2Fb&next=%2Fcallback",
    method: "PATCH",
    authType: "bearer",
    checkFrequencyMinutes: 30,
    status: "degraded",
    passRate: 91,
    latencyMs: 1400,
    monthlyCost: 20,
    includedInReports: true,
  };

  return {
    workflow,
    data: {
      agency: {
        id: "agency-1",
        name: "Agency",
        slug: "agency",
        primaryColor: "#7C6CF2",
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
        healthScore: 90,
        lastActivityAt: "2026-06-18T10:00:00.000Z",
        notes: "",
        archived: false,
      }],
      workflows: [workflow],
      checks: [{
        id: "check-1",
        agencyId: "agency-1",
        workflowId: workflow.id,
        name: "Endpoint health check",
        type: "health",
        schedule: "Every 30 minutes",
        enabled: true,
        configJson: {
          timeoutMs: 12000,
          requestBody: "{\"ping\":true}",
          assertions: [
            { type: "status_code", expected: 202 },
            { type: "latency_under", maxMs: 3000 },
            { type: "contains_text", value: "accepted" },
          ],
        },
        assertionCount: 3,
        latestStatus: "degraded",
      }],
      checkRuns: [],
      issues: [],
      testPacks: [],
      testCases: [],
      testRuns: [],
      workflowApiKeys: [],
      reports: [],
      reportItems: [],
    },
  };
}
