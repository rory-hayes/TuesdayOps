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
      expect(result).toEqual({
        attempted: 2,
        completed: 0,
        skipped: 1,
        failed: 1,
        failures: [{
          agencyId: "agency-1",
          checkId: "first",
          reason: "temporary failure with token=[redacted]",
        }],
      });
      expect(consoleError).toHaveBeenCalledWith("Scheduled check run failed", {
        agencyId: "agency-1",
        checkId: "first",
        reason: "temporary failure with token=[redacted]",
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("skips scheduled checks when the agency execution bucket is exhausted", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const executeCheckRun = vi.fn().mockResolvedValue({ status: "completed" });

    try {
      const result = await runScheduledCheckBatch({
        checks: [
          {
            id: "limited-check",
            agencyId: "agency-1",
            workflowId: "workflow-1",
            workflowEndpointUrl: "https://example.com/health",
            workflowFrequencyMinutes: 5,
            enabled: true,
            latestCompletedAt: null,
          },
        ],
        now,
        limit: 10,
        consumeRateLimit: vi.fn().mockResolvedValue({
          allowed: false,
          limit: 300,
          remaining: 0,
          resetAt: Date.now() + 120_000,
          retryAfterSeconds: 120,
        }),
        executeCheckRun,
      });

      expect(result).toEqual({ attempted: 1, completed: 0, skipped: 1, failed: 0 });
      expect(executeCheckRun).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith("Scheduled check run rate limited", {
        agencyId: "agency-1",
        checkId: "limited-check",
        retryAfterSeconds: 120,
      });
    } finally {
      consoleWarn.mockRestore();
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

    const dueSelectorCalls = rpc.mock.calls.filter(([name]) => name === "get_due_health_checks");

    expect(dueSelectorCalls).toHaveLength(3);
    expect(dueSelectorCalls[0]).toEqual(["get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 50,
      p_check_id: null,
      p_exclude_check_ids: [],
    }]);
    expect(dueSelectorCalls[2]).toEqual(["get_due_health_checks", {
      p_now: now.toISOString(),
      p_limit: 50,
      p_check_id: null,
      p_exclude_check_ids: Array.from({ length: 100 }, (_, index) => `check-${index}`),
    }]);
    expect(executeCheckRun).toHaveBeenCalledTimes(120);
  });

  it("can cap pages per invocation so hosted cron calls stay within runtime limits", async () => {
    vi.mocked(executeCheckRun).mockResolvedValue({
      status: "completed",
      checkRunId: "run-1",
      workflowId: "workflow-1",
      runStatus: "healthy",
    });
    const { supabase, rpc } = createScheduledSupabase({
      dueChecksResponses: [
        { data: buildDueCheckRows(4, 0), error: null },
        { data: buildDueCheckRows(4, 4), error: null },
      ],
    });

    await expect(
      runDueScheduledChecks({ supabase, now, limit: 4, maxPages: 1 }),
    ).resolves.toEqual({ attempted: 4, completed: 4, skipped: 0, failed: 0 });

    expect(rpc.mock.calls.filter(([name]) => name === "get_due_health_checks")).toHaveLength(1);
    expect(executeCheckRun).toHaveBeenCalledTimes(4);
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
      ).resolves.toEqual({
        attempted: 1,
        completed: 0,
        skipped: 0,
        failed: 1,
        failures: [{
          agencyId: "agency-0",
          checkId: "check-0",
          reason: "network unavailable",
        }],
      });
    } finally {
      consoleError.mockRestore();
    }

    expect(rpc.mock.calls.filter(([name]) => name === "get_due_health_checks")).toHaveLength(2);
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
  rateLimitResponse = {
    data: {
      allowed: true,
      limit_count: 300,
      remaining: 299,
      retry_after_seconds: 600,
      reset_at: "2026-06-13T12:15:00.000Z",
    },
    error: null,
  },
}: {
  dueChecksResponse?: { data: unknown[] | null; error: { message: string } | null };
  dueChecksResponses?: Array<{ data: unknown[] | null; error: { message: string } | null }>;
  rateLimitResponse?: {
    data: {
      allowed: boolean;
      limit_count: number;
      remaining: number;
      retry_after_seconds: number;
      reset_at: string;
    } | null;
    error: { message: string } | null;
  };
} = {}) {
  const rateLimitSingle = vi.fn().mockResolvedValue(rateLimitResponse);
  const responses = [...(dueChecksResponses ?? [dueChecksResponse])];
  const rpc = vi.fn((name: string, args?: { p_exclude_check_ids?: string[] }) => {
    if (name === "consume_rate_limit") {
      return { single: rateLimitSingle };
    }

    const response = responses.shift() ?? { data: [], error: null };
    const excludedIds = new Set(args?.p_exclude_check_ids ?? []);

    if (!response.data?.length || !excludedIds.size) {
      return Promise.resolve(response);
    }

    return Promise.resolve({
      ...response,
      data: response.data.filter((row) => {
        const check = row as { id?: string };

        return !check.id || !excludedIds.has(check.id);
      }),
    });
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
