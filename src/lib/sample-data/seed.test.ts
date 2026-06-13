import { describe, expect, it } from "vitest";
import { buildSampleDataSeed } from "@/lib/sample-data/seed";

describe("buildSampleDataSeed", () => {
  it("builds tenant-scoped demo rows for the full proof loop", () => {
    const seed = buildSampleDataSeed({
      agencyId: "agency-1",
      now: new Date("2026-06-13T12:00:00.000Z"),
      ids: {
        clientId: "client-1",
        workflowId: "workflow-1",
        checkId: "check-1",
        healthyRunId: "run-healthy",
        failedRunId: "run-failed",
        issueId: "issue-1",
        testPackId: "pack-1",
        testCaseId: "case-1",
        testRunId: "test-run-1",
        reportId: "report-1",
        reportItemIds: ["item-1", "item-2", "item-3"],
      },
    });

    expect(seed.client.agency_id).toBe("agency-1");
    expect(seed.workflow).toMatchObject({
      agency_id: "agency-1",
      client_id: "client-1",
      auth_type: "none",
      encrypted_auth_config: null,
    });
    expect(seed.check).toMatchObject({
      agency_id: "agency-1",
      workflow_id: "workflow-1",
      enabled: true,
    });
    expect(seed.checkRuns.map((run) => run.agency_id)).toEqual(["agency-1", "agency-1"]);
    expect(seed.issue).toMatchObject({
      agency_id: "agency-1",
      client_id: "client-1",
      workflow_id: "workflow-1",
      check_run_id: "run-failed",
      reportable: true,
    });
    expect(seed.testPack.workflow_id).toBe("workflow-1");
    expect(seed.testCase.test_pack_id).toBe("pack-1");
    expect(seed.testRun.test_case_id).toBe("case-1");
    expect(seed.report).toMatchObject({
      agency_id: "agency-1",
      client_id: "client-1",
      period: "2026-06",
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      status: "ready_to_send",
    });
    expect(seed.reportItems).toHaveLength(3);
    expect(seed.reportItems.every((item) => item.report_id === "report-1")).toBe(true);
  });
});
