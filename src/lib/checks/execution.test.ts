import { beforeEach, describe, expect, it, vi } from "vitest";
import { runHttpCheck } from "@/lib/checks/runner";
import { createOrUpdateIssueForCheckRun } from "@/lib/issues/operations";
import { buildCheckRunInsert, executeCheckRun, isDuplicateScheduledRunError } from "./execution";

vi.mock("@/lib/checks/runner", () => ({
  runHttpCheck: vi.fn(),
}));

vi.mock("@/lib/issues/operations", () => ({
  createOrUpdateIssueForCheckRun: vi.fn(),
}));

const healthyResult = {
  status: "healthy" as const,
  statusCode: 200,
  latencyMs: 120,
  responseSummary: "{\"ok\":true}",
  assertionResults: [{ type: "status_code" as const, passed: true, message: "Expected HTTP 200." }],
  startedAt: "2026-06-13T12:05:01.000Z",
  completedAt: "2026-06-13T12:05:02.000Z",
};

describe("check execution persistence helpers", () => {
  beforeEach(() => {
    vi.mocked(runHttpCheck).mockReset();
    vi.mocked(createOrUpdateIssueForCheckRun).mockReset();
  });

  it("adds scheduled metadata to scheduled check run inserts", () => {
    expect(
      buildCheckRunInsert({
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        checkId: "check-1",
        trigger: "scheduled",
        scheduledFor: "2026-06-13T12:05:00.000Z",
        result: {
          status: "healthy",
          statusCode: 200,
          latencyMs: 120,
          responseSummary: "{\"ok\":true}",
          assertionResults: [],
          startedAt: "2026-06-13T12:05:01.000Z",
          completedAt: "2026-06-13T12:05:02.000Z",
        },
      }),
    ).toMatchObject({
      agency_id: "agency-1",
      client_id: "client-1",
      workflow_id: "workflow-1",
      check_id: "check-1",
      trigger: "scheduled",
      scheduled_for: "2026-06-13T12:05:00.000Z",
      status: "healthy",
    });
  });

  it("does not attach scheduled window metadata to manual check runs", () => {
    expect(
      buildCheckRunInsert({
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        checkId: "check-1",
        trigger: "manual",
        result: {
          status: "failed",
          latencyMs: 250,
          responseSummary: "",
          assertionResults: [],
          errorMessage: "Request timed out.",
          startedAt: "2026-06-13T12:05:01.000Z",
          completedAt: "2026-06-13T12:05:02.000Z",
        },
      }),
    ).toMatchObject({
      trigger: "manual",
      scheduled_for: null,
    });
  });

  it("recognizes duplicate scheduled run errors as idempotent skips", () => {
    expect(isDuplicateScheduledRunError({ code: "23505" })).toBe(true);
    expect(isDuplicateScheduledRunError({ code: "42501" })).toBe(false);
    expect(isDuplicateScheduledRunError(null)).toBe(false);
  });

  it("loads a check, stores the run, creates issues, and updates workflow health", async () => {
    vi.mocked(runHttpCheck).mockResolvedValue(healthyResult);
    vi.mocked(createOrUpdateIssueForCheckRun).mockResolvedValue(null);
    const { supabase, inserts, workflowUpdates } = createExecutionSupabase({
      recentRunsResponse: {
        data: [
          { status: "healthy", latency_ms: 120 },
          { status: "failed", latency_ms: 450 },
          { status: "healthy", latency_ms: 110 },
        ],
        error: null,
      },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).resolves.toEqual({
      status: "completed",
      checkRunId: "run-1",
      workflowId: "workflow-1",
      runStatus: "healthy",
    });

    expect(runHttpCheck).toHaveBeenCalledWith({
      workflow: {
        endpointUrl: "https://api.example.com/health",
        method: "GET",
        authType: "none",
      },
      check: {
        configJson: { assertions: [{ type: "status_code", expected: 200 }] },
      },
      authConfig: { type: "none" },
    });
    expect(inserts).toContainEqual(
      expect.objectContaining({
        agency_id: "agency-1",
        client_id: "client-1",
        workflow_id: "workflow-1",
        check_id: "check-1",
        status: "healthy",
        trigger: "manual",
      }),
    );
    expect(createOrUpdateIssueForCheckRun).toHaveBeenCalledWith({
      supabase,
      context: expect.objectContaining({
        agencyId: "agency-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        workflowName: "Lead Intake",
        checkId: "check-1",
        checkRunId: "run-1",
        status: "healthy",
      }),
    });
    expect(workflowUpdates).toContainEqual(
      expect.objectContaining({
        status: "healthy",
        pass_rate: 67,
        latency_ms: 120,
        last_check_at: "2026-06-13T12:05:02.000Z",
      }),
    );
  });

  it("skips duplicate scheduled windows without creating issues or updating workflow summaries", async () => {
    vi.mocked(runHttpCheck).mockResolvedValue(healthyResult);
    const { supabase, workflowUpdates } = createExecutionSupabase({
      runInsertResponse: { data: null, error: { code: "23505", message: "duplicate scheduled run" } },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "scheduled",
        scheduledFor: "2026-06-13T12:05:00.000Z",
      }),
    ).resolves.toEqual({
      status: "skipped",
      reason: "duplicate_scheduled_window",
      workflowId: "workflow-1",
    });

    expect(createOrUpdateIssueForCheckRun).not.toHaveBeenCalled();
    expect(workflowUpdates).toEqual([]);
  });

  it("skips duplicate scheduled windows before calling the workflow endpoint", async () => {
    const { supabase, inserts, workflowUpdates } = createExecutionSupabase({
      existingScheduledRunResponse: {
        data: { id: "existing-run", workflow_id: "workflow-1" },
        error: null,
      },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "scheduled",
        scheduledFor: "2026-06-13T12:05:00.000Z",
      }),
    ).resolves.toEqual({
      status: "skipped",
      reason: "duplicate_scheduled_window",
      workflowId: "workflow-1",
    });

    expect(runHttpCheck).not.toHaveBeenCalled();
    expect(createOrUpdateIssueForCheckRun).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
    expect(workflowUpdates).toEqual([]);
  });

  it("creates issues for degraded scheduled runs and updates workflow health", async () => {
    const degradedResult = {
      ...healthyResult,
      status: "degraded" as const,
      assertionResults: [
        {
          type: "latency_under" as const,
          passed: false,
          message: "Expected latency under 100ms.",
        },
      ],
    };
    vi.mocked(runHttpCheck).mockResolvedValue(degradedResult);
    vi.mocked(createOrUpdateIssueForCheckRun).mockResolvedValue({ id: "issue-1", created: true });
    const { supabase, workflowUpdates } = createExecutionSupabase();

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "scheduled",
        scheduledFor: "2026-06-13T12:05:00.000Z",
      }),
    ).resolves.toEqual({
      status: "completed",
      checkRunId: "run-1",
      workflowId: "workflow-1",
      runStatus: "degraded",
    });

    expect(createOrUpdateIssueForCheckRun).toHaveBeenCalledWith({
      supabase,
      context: expect.objectContaining({
        agencyId: "agency-1",
        checkId: "check-1",
        checkRunId: "run-1",
        status: "degraded",
      }),
    });
    expect(workflowUpdates).toContainEqual(expect.objectContaining({ status: "degraded" }));
  });

  it("throws when check run persistence fails for a non-idempotent error", async () => {
    vi.mocked(runHttpCheck).mockResolvedValue(healthyResult);
    const { supabase } = createExecutionSupabase({
      runInsertResponse: { data: null, error: { code: "42501", message: "RLS denied" } },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).rejects.toThrow("Check run could not be saved: RLS denied");
  });

  it("throws when Supabase returns no saved run row", async () => {
    vi.mocked(runHttpCheck).mockResolvedValue(healthyResult);
    const { supabase } = createExecutionSupabase({
      runInsertResponse: { data: null, error: null },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).rejects.toThrow("Check run could not be saved.");
  });

  it("throws when the check or tenant-scoped workflow cannot be loaded", async () => {
    const missingCheck = createExecutionSupabase({
      checkResponse: { data: null, error: { message: "No rows returned" } },
    });

    await expect(
      executeCheckRun({
        supabase: missingCheck.supabase,
        agencyId: "agency-1",
        checkId: "missing-check",
        trigger: "manual",
      }),
    ).rejects.toThrow("No rows returned");

    const noCheckRow = createExecutionSupabase({
      checkResponse: { data: null, error: null },
    });

    await expect(
      executeCheckRun({
        supabase: noCheckRow.supabase,
        agencyId: "agency-1",
        checkId: "missing-check",
        trigger: "manual",
      }),
    ).rejects.toThrow("Check could not be found.");

    const wrongTenantWorkflow = createExecutionSupabase({
      checkResponse: {
        data: buildCheckRow({ workflows: { ...workflowRow, agency_id: "agency-2" } }),
        error: null,
      },
    });

    await expect(
      executeCheckRun({
        supabase: wrongTenantWorkflow.supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).rejects.toThrow("Workflow could not be loaded for this check.");

    const emptyWorkflowJoin = createExecutionSupabase({
      checkResponse: {
        data: buildCheckRow({ workflows: [] }),
        error: null,
      },
    });

    await expect(
      executeCheckRun({
        supabase: emptyWorkflowJoin.supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).rejects.toThrow("Workflow could not be loaded for this check.");
  });

  it("uses the latest result when there are no recent runs and surfaces workflow update failures", async () => {
    vi.mocked(runHttpCheck).mockResolvedValue({ ...healthyResult, status: "failed" });
    vi.mocked(createOrUpdateIssueForCheckRun).mockResolvedValue({ id: "issue-1", created: true });
    const { supabase, workflowUpdates } = createExecutionSupabase({
      recentRunsResponse: { data: [], error: null },
      workflowUpdateResponse: { error: { message: "workflow locked" } },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).rejects.toThrow("Workflow summary could not be updated: workflow locked");

    expect(workflowUpdates).toContainEqual(expect.objectContaining({ status: "failed", pass_rate: 0 }));
  });

  it("supports Supabase joins returned as arrays and falls back to the current healthy run for pass rate", async () => {
    vi.mocked(runHttpCheck).mockResolvedValue(healthyResult);
    vi.mocked(createOrUpdateIssueForCheckRun).mockResolvedValue(null);
    const { supabase, workflowUpdates } = createExecutionSupabase({
      checkResponse: { data: buildCheckRow({ workflows: [workflowRow] }), error: null },
      recentRunsResponse: { data: null, error: null },
    });

    await expect(
      executeCheckRun({
        supabase,
        agencyId: "agency-1",
        checkId: "check-1",
        trigger: "manual",
      }),
    ).resolves.toMatchObject({ status: "completed", runStatus: "healthy" });

    expect(workflowUpdates).toContainEqual(expect.objectContaining({ pass_rate: 100 }));
  });
});

const workflowRow = {
  id: "workflow-1",
  agency_id: "agency-1",
  client_id: "client-1",
  name: "Lead Intake",
  endpoint_url: "https://api.example.com/health",
  method: "GET",
  auth_type: "none",
  encrypted_auth_config: null,
};

function buildCheckRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "check-1",
    agency_id: "agency-1",
    workflow_id: "workflow-1",
    name: "Endpoint health",
    config_json: { assertions: [{ type: "status_code", expected: 200 }] },
    workflows: workflowRow,
    ...overrides,
  };
}

function createExecutionSupabase({
  checkResponse = { data: buildCheckRow(), error: null },
  runInsertResponse = { data: { id: "run-1" }, error: null },
  existingScheduledRunResponse = { data: null, error: null },
  recentRunsResponse = { data: [{ status: "healthy", latency_ms: 120 }], error: null },
  workflowUpdateResponse = { error: null },
}: {
  checkResponse?: { data: unknown; error: { message: string } | null };
  runInsertResponse?: { data: { id: string } | null; error: { code?: string; message: string } | null };
  existingScheduledRunResponse?: {
    data: { id: string; workflow_id: string } | null;
    error: { message: string } | null;
  };
  recentRunsResponse?: { data: Array<{ status: string; latency_ms: number }> | null; error: unknown };
  workflowUpdateResponse?: { error: { message: string } | null };
} = {}) {
  const inserts: unknown[] = [];
  const workflowUpdates: unknown[] = [];

  const supabase = {
    from(table: string) {
      if (table === "checks") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          single: async () => checkResponse,
        };
      }

      if (table === "check_runs") {
        const existingRunQuery = {
          eq() {
            return this;
          },
          maybeSingle: async () => existingScheduledRunResponse,
        };
        const recentRunsQuery = {
          eq() {
            return this;
          },
          order() {
            return this;
          },
          limit: async () => recentRunsResponse,
        };

        return {
          insert(payload: unknown) {
            inserts.push(payload);

            return {
              select() {
                return this;
              },
              single: async () => runInsertResponse,
            };
          },
          select(columns?: string) {
            if (columns?.includes("workflow_id")) {
              return existingRunQuery;
            }

            return recentRunsQuery;
          },
        };
      }

      if (table === "workflows") {
        return {
          update(payload: unknown) {
            workflowUpdates.push(payload);

            return {
              eq() {
                return this;
              },
              then(resolve: (value: typeof workflowUpdateResponse) => void) {
                return Promise.resolve(workflowUpdateResponse).then(resolve);
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as never;

  return { supabase, inserts, workflowUpdates };
}
