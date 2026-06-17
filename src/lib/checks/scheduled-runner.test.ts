import { describe, expect, it, vi } from "vitest";
import { executeCheckRun } from "@/lib/checks/execution";
import { loadSchedulableChecks, runDueScheduledChecks, runScheduledCheckBatch } from "./scheduled-runner";

vi.mock("@/lib/checks/execution", () => ({
  executeCheckRun: vi.fn(),
}));

const now = new Date("2026-06-13T12:08:37.000Z");

describe("scheduled check batch runner", () => {
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
    });
    expect(executeCheckRun).toHaveBeenCalledWith({
      supabase,
      agencyId: "agency-1",
      checkId: "check-1",
      scheduledFor: "2026-06-13T12:05:00.000Z",
      trigger: "scheduled",
    });
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
    });
  });
});

function createScheduledSupabase({
  dueChecksResponse = { data: [], error: null },
}: {
  dueChecksResponse?: { data: unknown[] | null; error: { message: string } | null };
} = {}) {
  const rpc = vi.fn().mockResolvedValue(dueChecksResponse);
  const supabase = {
    rpc,
  } as never;

  return { supabase, rpc };
}
