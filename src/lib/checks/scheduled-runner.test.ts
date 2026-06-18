import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeCheckRun } from "@/lib/checks/execution";
import { loadSchedulableChecks, runDueScheduledChecks, runScheduledCheckBatch } from "./scheduled-runner";

vi.mock("@/lib/checks/execution", () => ({
  executeCheckRun: vi.fn(),
}));

const now = new Date("2026-06-13T12:08:37.000Z");

describe("scheduled check batch runner", () => {
  beforeEach(() => {
    vi.mocked(executeCheckRun).mockReset();
  });

  it("runs only due checks with a stable scheduled window", async () => {
    const executeCheckRun = vi.fn().mockResolvedValue({ status: "completed" });

    const result = await runScheduledCheckBatch({
      checks: [
        {
          id: "due",
          agencyId: "agency-1",
          workflowId: "workflow-1",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: "2026-06-13T12:00:00.000Z",
        },
        {
          id: "not-due",
          agencyId: "agency-1",
          workflowId: "workflow-2",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 15,
          enabled: true,
          latestCompletedAt: "2026-06-13T12:00:00.000Z",
        },
      ],
      now,
      limit: 10,
      executeCheckRun,
    });

    expect(executeCheckRun).toHaveBeenCalledTimes(1);
    expect(executeCheckRun).toHaveBeenCalledWith({
      agencyId: "agency-1",
      checkId: "due",
      scheduledFor: "2026-06-13T12:05:00.000Z",
      trigger: "scheduled",
    });
    expect(result).toEqual({ attempted: 1, completed: 1, skipped: 0, failed: 0 });
  });

  it("keeps processing when one scheduled check fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const executeCheckRun = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure with token=secret-123"))
      .mockResolvedValueOnce({ status: "skipped" });

    try {
      const result = await runScheduledCheckBatch({
        checks: [
          {
            id: "first",
            agencyId: "agency-1",
            workflowId: "workflow-1",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 5,
            enabled: true,
            latestCompletedAt: null,
          },
          {
            id: "second",
            agencyId: "agency-1",
            workflowId: "workflow-2",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 5,
            enabled: true,
            latestCompletedAt: null,
          },
        ],
        now,
        limit: 10,
        executeCheckRun,
      });

      expect(executeCheckRun).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ attempted: 2, completed: 0, skipped: 1, failed: 1 });
      expect(consoleError).toHaveBeenCalledWith("Scheduled check run failed", {
        agencyId: "agency-1",
        checkId: "first",
        reason: "temporary failure with token=[redacted]",
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("can target one due check for operational smoke tests", async () => {
    const executeCheckRun = vi.fn().mockResolvedValue({ status: "completed" });

    const result = await runScheduledCheckBatch({
      checks: [
        {
          id: "crowding-check",
          agencyId: "agency-1",
          workflowId: "workflow-1",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: null,
        },
        {
          id: "target-check",
          agencyId: "agency-2",
          workflowId: "workflow-2",
          workflowEndpointUrl: "https://example.com/health",
          workflowFrequencyMinutes: 5,
          enabled: true,
          latestCompletedAt: null,
        },
      ],
      now,
      limit: 1,
      checkId: "target-check",
      executeCheckRun,
    });

    expect(executeCheckRun).toHaveBeenCalledTimes(1);
    expect(executeCheckRun).toHaveBeenCalledWith({
      agencyId: "agency-2",
      checkId: "target-check",
      scheduledFor: "2026-06-13T12:05:00.000Z",
      trigger: "scheduled",
    });
    expect(result).toEqual({ attempted: 1, completed: 1, skipped: 0, failed: 0 });
  });

  it("loads due checks from the database due-check selector", async () => {
    const { supabase, rpc } = createScheduledSupabase({
      dueChecksResponse: {
        data: [
          {
            id: "check-1",
            agency_id: "agency-1",
            workflow_id: "workflow-1",
            enabled: true,
            endpoint_url: "https://api.example.com/health",
            check_frequency_minutes: 15,
            latest_completed_at: "2026-06-13T12:00:00.000Z",
          },
          {
            id: "check-2",
            agency_id: "agency-1",
            workflow_id: "workflow-2",
            enabled: true,
            endpoint_url: null,
            check_frequency_minutes: 0,
            latest_completed_at: null,
          },
        ],
        error: null,
      },
    });

    await expect(loadSchedulableChecks({ supabase, now, limit: 25, checkId: "check-1" })).resolves.toEqual([
      {
        id: "check-1",
        agencyId: "agency-1",
        workflowId: "workflow-1",
        workflowEndpointUrl: "https://api.example.com/health",
        workflowFrequencyMinutes: 15,
        enabled: true,
        latestCompletedAt: "2026-06-13T12:00:00.000Z",
      },
      {
        id: "check-2",
        agencyId: "agency-1",
        workflowId: "workflow-2",
        workflowEndpointUrl: null,
        workflowFrequencyMinutes: 0,
        enabled: true,
        latestCompletedAt: null,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 25,
      p_check_id: "check-1",
      p_exclude_check_ids: [],
    });
  });

  it("surfaces due-check selector failures", async () => {
    await expect(
      loadSchedulableChecks({
        supabase: createScheduledSupabase({
          dueChecksResponse: { data: null, error: { message: "checks offline" } },
        }).supabase,
      }),
    ).rejects.toThrow("Unable to load scheduled checks: checks offline");
  });

  it("loads and runs due scheduled checks through the production entry point", async () => {
    vi.mocked(executeCheckRun).mockResolvedValue({
      status: "completed",
      checkRunId: "run-1",
      workflowId: "workflow-1",
      runStatus: "healthy",
    });
    const { supabase, rpc } = createScheduledSupabase({
      dueChecksResponse: {
        data: [
          {
            id: "check-1",
            agency_id: "agency-1",
            workflow_id: "workflow-1",
            enabled: true,
            endpoint_url: "https://api.example.com/health",
            check_frequency_minutes: 5,
            latest_completed_at: null,
          },
        ],
        error: null,
      },
    });

    await expect(
      runDueScheduledChecks({ supabase, now, limit: 2 }),
    ).resolves.toEqual({ attempted: 1, completed: 1, skipped: 0, failed: 0 });
    expect(rpc).toHaveBeenCalledWith("get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 2,
      p_check_id: null,
      p_exclude_check_ids: [],
    });
    expect(executeCheckRun).toHaveBeenCalledWith({
      supabase,
      agencyId: "agency-1",
      checkId: "check-1",
      scheduledFor: "2026-06-13T12:05:00.000Z",
      trigger: "scheduled",
    });
  });

  it("drains database-selected due checks in pages so high-volume tenants are not starved", async () => {
    vi.mocked(executeCheckRun).mockResolvedValue({
      status: "completed",
      checkRunId: "run-1",
      workflowId: "workflow-1",
      runStatus: "healthy",
    });
    const pages = [
      buildDueCheckRows(50, 0),
      buildDueCheckRows(50, 50),
      buildDueCheckRows(20, 100),
    ];
    const { supabase, rpc } = createScheduledSupabase({
      dueChecksResponses: pages.map((data) => ({ data, error: null })),
    });

    await expect(
      runDueScheduledChecks({ supabase, now, limit: 50 }),
    ).resolves.toEqual({ attempted: 120, completed: 120, skipped: 0, failed: 0 });

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenNthCalledWith(1, "get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 50,
      p_check_id: null,
      p_exclude_check_ids: [],
    });
    expect(rpc).toHaveBeenNthCalledWith(3, "get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 50,
      p_check_id: null,
      p_exclude_check_ids: Array.from({ length: 100 }, (_, index) => `check-${index}`),
    });
    expect(executeCheckRun).toHaveBeenCalledTimes(120);
  });

  it("does not retry the same due check forever when a page remains due after a failed attempt", async () => {
    vi.mocked(executeCheckRun).mockRejectedValue(new Error("network unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const repeatedPage = buildDueCheckRows(1, 0);
    const { supabase, rpc } = createScheduledSupabase({
      dueChecksResponses: [
        { data: repeatedPage, error: null },
        { data: repeatedPage, error: null },
      ],
    });

    try {
      await expect(
        runDueScheduledChecks({ supabase, now, limit: 1 }),
      ).resolves.toEqual({ attempted: 1, completed: 0, skipped: 0, failed: 1 });
    } finally {
      consoleError.mockRestore();
    }

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(executeCheckRun).toHaveBeenCalledTimes(1);
  });

  it("uses a single-row load limit when a scheduler smoke check targets one check", async () => {
    vi.mocked(executeCheckRun).mockResolvedValue({ status: "skipped", reason: "duplicate_scheduled_window" });
    const { supabase, rpc } = createScheduledSupabase({
      dueChecksResponse: {
        data: [
          {
            id: "target-check",
            agency_id: "agency-1",
            workflow_id: "workflow-1",
            enabled: true,
            endpoint_url: "https://api.example.com/health",
            check_frequency_minutes: 5,
            latest_completed_at: null,
          },
        ],
        error: null,
      },
    });

    await expect(
      runDueScheduledChecks({ supabase, now, limit: 50, checkId: "target-check" }),
    ).resolves.toEqual({ attempted: 1, completed: 0, skipped: 1, failed: 0 });
    expect(rpc).toHaveBeenCalledWith("get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 1,
      p_check_id: "target-check",
      p_exclude_check_ids: [],
    });
  });
});

function createScheduledSupabase({
  dueChecksResponse = { data: [], error: null },
  dueChecksResponses,
}: {
  dueChecksResponse?: { data: unknown[] | null; error: { message: string } | null };
  dueChecksResponses?: Array<{ data: unknown[] | null; error: { message: string } | null }>;
} = {}) {
  const responses = [...(dueChecksResponses ?? [dueChecksResponse])];
  const rpc = vi.fn(async (_functionName: string, args?: { p_exclude_check_ids?: string[] }) => {
    const response = responses.shift() ?? { data: [], error: null };
    const excludedIds = new Set(args?.p_exclude_check_ids ?? []);

    if (!response.data?.length || !excludedIds.size) {
      return response;
    }

    return {
      ...response,
      data: response.data.filter((row) => {
        const check = row as { id?: string };

        return !check.id || !excludedIds.has(check.id);
      }),
    };
  });
  const supabase = {
    rpc,
  } as never;

  return { supabase, rpc };
}

function buildDueCheckRows(count: number, offset: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `check-${offset + index}`,
    agency_id: `agency-${Math.floor((offset + index) / 25)}`,
    workflow_id: `workflow-${offset + index}`,
    enabled: true,
    endpoint_url: "https://api.example.com/health",
    check_frequency_minutes: 5,
    latest_completed_at: null,
  }));
}
