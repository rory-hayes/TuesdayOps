/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OverviewActionCenter } from "@/components/dashboard/overview-action-center";
import type { Check, CheckRun, Client, Issue, Workflow } from "@/lib/domain/types";

describe("OverviewActionCenter", () => {
  afterEach(() => cleanup());

  it("keeps secondary overview streams in keyboard-accessible tabs", () => {
    render(
      <OverviewActionCenter
        openIssues={[issue]}
        recentRuns={[run]}
        scheduledChecks={[check]}
        workflows={[workflow]}
        clients={[client]}
        reportsDue={1}
        reliability={{
          ready: false,
          blockers: ["1 high or critical issue is still open."],
          checks: [
            {
              id: "critical_issues",
              label: "High-risk issues",
              status: "attention",
              value: 1,
              detail: "1 high or critical issue is still open.",
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("tab", { name: "Issues, 1 item" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Lead intake returned HTTP 500")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Runs, 1 item" }));
    expect(screen.getByRole("tab", { name: "Runs, 1 item" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Lead intake")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Readiness, 1 item" }));
    expect(screen.getByText("High-risk issues")).toBeTruthy();
  });
});

const client: Client = {
  id: "client-1",
  agencyId: "agency-1",
  name: "Acme",
  slug: "acme",
  industry: "Services",
  owner: "Ops",
  reportRecipientEmail: "ops@example.com",
  reportStatus: "draft",
  reportAutomationEnabled: true,
  healthScore: 82,
  lastActivityAt: "2026-06-18T10:00:00.000Z",
  notes: "",
  archived: false,
};

const workflow: Workflow = {
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
};

const check: Check = {
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
};

const run: CheckRun = {
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
};

const issue: Issue = {
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
};
