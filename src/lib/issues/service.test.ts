import { beforeEach, describe, expect, it, vi } from "vitest";
import * as issueService from "@/lib/issues/service";
import { recordAuditEvent } from "@/lib/audit/events";
import { executeCheckRun } from "@/lib/checks/execution";
import { assertPersistentRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  requireWorkspace: vi.fn(),
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
  createClient: vi.fn(),
  recordAuditEvent: vi.fn(),
  executeCheckRun: vi.fn(),
  assertPersistentRateLimit: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/workspace", () => ({
  requireWorkspace: mocks.requireWorkspace,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/audit/events", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

vi.mock("@/lib/checks/execution", () => ({
  executeCheckRun: mocks.executeCheckRun,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertPersistentRateLimit: mocks.assertPersistentRateLimit,
}));

const workspace = {
  agency: { id: "agency-1" },
  user: { id: "user-1" },
};

describe("issue server actions", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.requireWorkspace.mockResolvedValue(workspace);
    mocks.recordAuditEvent.mockResolvedValue(undefined);
    mocks.assertPersistentRateLimit.mockResolvedValue(undefined);
    mocks.executeCheckRun.mockResolvedValue({
      status: "completed",
      checkRunId: "run-new",
      runStatus: "healthy",
    });
  });

  it("assigns an issue inside the tenant boundary, clears snooze state, and records an audit event", async () => {
    const supabase = createSupabaseActionStub();
    mocks.createClient.mockResolvedValue(supabase.client);

    await expectRedirect(
      issueService.assignIssueToMeAction(formData({ issueId: issueId(), returnTo: "/issues/issue-1" })),
      "/issues/issue-1?notice=Issue%20assigned.",
    );

    expect(supabase.updates).toContainEqual({
      table: "issues",
      payload: {
        owner_user_id: "user-1",
        status: "in_review",
        snoozed_until: null,
      },
      filters: [
        ["agency_id", "agency-1"],
        ["id", issueId()],
      ],
    });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      agencyId: "agency-1",
      actorUserId: "user-1",
      action: "issue.assigned",
      targetType: "issue",
      targetId: issueId(),
      metadata: { status: "in_review" },
    }));
  });

  it("updates a maintenance note without resolving the issue and records an audit event", async () => {
    const supabase = createSupabaseActionStub();
    mocks.createClient.mockResolvedValue(supabase.client);
    const action = (issueService as unknown as {
      updateIssueNoteAction?: (formData: FormData) => Promise<void>;
    }).updateIssueNoteAction;

    expect(typeof action).toBe("function");

    await expectRedirect(
      action?.(formData({
        issueId: issueId(),
        returnTo: "/issues/issue-1",
        maintenanceNote: "Rotating the upstream key, then rerunning the source check.",
      })) ?? Promise.resolve(),
      "/issues/issue-1?notice=Issue%20note%20saved.",
    );

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "issues",
      payload: { maintenance_note: "Rotating the upstream key, then rerunning the source check." },
    }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "issue.noted",
      targetType: "issue",
      targetId: issueId(),
      metadata: { hasNote: true },
    }));
  });

  it("reruns the source check for the issue and audits the check run", async () => {
    const supabase = createSupabaseActionStub({
      reads: {
        issues: { id: issueId(), workflow_id: "workflow-1", check_run_id: "run-1" },
        check_runs: { id: "run-1", check_id: "check-1" },
      },
    });
    mocks.createClient.mockResolvedValue(supabase.client);

    await expectRedirect(
      issueService.rerunIssueCheckAction(formData({ issueId: issueId(), returnTo: "/issues/issue-1" })),
      "/issues/issue-1?notice=Check%20rerun%20completed.",
    );

    expect(assertPersistentRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      scope: "manual-check-run",
      identifier: "agency-1:user-1",
    }));
    expect(executeCheckRun).toHaveBeenCalledWith(expect.objectContaining({
      supabase: supabase.client,
      agencyId: "agency-1",
      checkId: "check-1",
      trigger: "manual",
    }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "check.run",
      targetType: "check",
      targetId: "check-1",
      metadata: expect.objectContaining({
        trigger: "issue_rerun",
        issueId: issueId(),
        checkRunId: "run-new",
        runStatus: "healthy",
      }),
    }));
  });

  it("resolves an issue with a note, clears stale snooze state, and audits the resolution", async () => {
    const supabase = createSupabaseActionStub();
    mocks.createClient.mockResolvedValue(supabase.client);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T12:00:00.000Z"));

    await expectRedirect(
      issueService.resolveIssueAction(formData({
        issueId: issueId(),
        returnTo: "/issues/issue-1",
        resolutionNote: "Refreshed the expired credential and reran the health check.",
      })),
      "/issues/issue-1?notice=Issue%20resolved.",
    );

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "issues",
      payload: {
        status: "resolved",
        resolved_at: "2026-06-18T12:00:00.000Z",
        resolution_note: "Refreshed the expired credential and reran the health check.",
        snoozed_until: null,
      },
    }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "issue.resolved",
      targetType: "issue",
      targetId: issueId(),
      metadata: { status: "resolved" },
    }));
  });

  it("snoozes issues for a bounded period and audits the wake-up time", async () => {
    const supabase = createSupabaseActionStub();
    mocks.createClient.mockResolvedValue(supabase.client);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T12:00:00.000Z"));

    await expectRedirect(
      issueService.snoozeIssueAction(formData({ issueId: issueId(), returnTo: "/issues/issue-1", snoozeDays: "7" })),
      "/issues/issue-1?notice=Issue%20snoozed.",
    );

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "issues",
      payload: {
        status: "snoozed",
        snoozed_until: "2026-06-25T12:00:00.000Z",
      },
    }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "issue.snoozed",
      metadata: { status: "snoozed", snoozedUntil: "2026-06-25T12:00:00.000Z" },
    }));
  });

  it("ignores an issue by excluding it from reports, clearing snooze state, and auditing the action", async () => {
    const supabase = createSupabaseActionStub();
    mocks.createClient.mockResolvedValue(supabase.client);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T12:00:00.000Z"));

    await expectRedirect(
      issueService.ignoreIssueAction(formData({ issueId: issueId(), returnTo: "/issues/issue-1" })),
      "/issues/issue-1?notice=Issue%20ignored.",
    );

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "issues",
      payload: {
        status: "ignored",
        reportable: false,
        resolved_at: "2026-06-18T12:00:00.000Z",
        resolution_note: "Ignored for reporting.",
        snoozed_until: null,
      },
    }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "issue.ignored",
      metadata: { status: "ignored", reportable: false },
    }));
  });

  it("toggles report inclusion inside the tenant boundary and records an audit event", async () => {
    const supabase = createSupabaseActionStub();
    mocks.createClient.mockResolvedValue(supabase.client);

    await expectRedirect(
      issueService.setIssueReportableAction(formData({
        issueId: issueId(),
        returnTo: "/issues/issue-1",
        reportable: "false",
      })),
      "/issues/issue-1?notice=Issue%20excluded%20from%20reports.",
    );

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "issues",
      payload: { reportable: false },
      filters: [
        ["agency_id", "agency-1"],
        ["id", issueId()],
      ],
    }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "issue.reportable_updated",
      targetType: "issue",
      targetId: issueId(),
      metadata: { reportable: false },
    }));
  });
});

async function expectRedirect(action: Promise<void>, url: string) {
  await expect(action).rejects.toThrow(`NEXT_REDIRECT:${url}`);
}

function issueId() {
  return "11111111-1111-4111-8111-111111111111";
}

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

function createSupabaseActionStub({
  reads = {},
  mutationResult = { data: { id: issueId() }, error: null },
}: {
  reads?: Record<string, unknown>;
  mutationResult?: { data: { id: string } | null; error: { message: string } | null };
} = {}) {
  const updates: Array<{
    table: string;
    payload: unknown;
    filters: Array<[string, unknown]>;
  }> = [];
  const readsByTable = new Map(Object.entries(reads));
  const client = {
    from(table: string) {
      return createActionQuery({
        table,
        updates,
        read: readsByTable.get(table) ?? null,
        mutationResult,
      });
    },
  };

  return {
    client: client as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    updates,
  };
}

function createActionQuery({
  table,
  updates,
  read,
  mutationResult,
}: {
  table: string;
  updates: Array<{ table: string; payload: unknown; filters: Array<[string, unknown]> }>;
  read: unknown;
  mutationResult: { data: { id: string } | null; error: { message: string } | null };
}) {
  const filters: Array<[string, unknown]> = [];
  let updatePayload: unknown;

  const query = {
    select() {
      return query;
    },
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return query;
    },
    update(payload: unknown) {
      updatePayload = payload;
      return query;
    },
    maybeSingle: async () => {
      if (updatePayload !== undefined) {
        updates.push({ table, payload: updatePayload, filters: [...filters] });
        return mutationResult;
      }

      return { data: read, error: null };
    },
  };

  return query;
}
