import { describe, expect, it } from "vitest";
import { syncSyntheticIssueForTestRun } from "@/lib/test-packs/issues";

describe("syncSyntheticIssueForTestRun", () => {
  it("creates a reportable synthetic issue when a test case fails for the first time", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const supabase = createSyntheticIssueSupabase({
      activeIssue: null,
      updates,
      inserts,
    });

    const result = await syncSyntheticIssueForTestRun({
      supabase,
      now: "2026-06-15T20:00:00.000Z",
      context: buildContext({ status: "failed", errorMessage: "Expected field result to exist." }),
    });

    expect(result).toEqual({ id: "inserted-issue", created: true });
    expect(updates).toEqual([]);
    expect(inserts).toContainEqual({
      agency_id: "agency-1",
      client_id: "client-1",
      workflow_id: "workflow-1",
      test_run_id: "test-run-1",
      fingerprint: "synthetic:pack-1:case-1:failed",
      severity: "medium",
      status: "open",
      title: "Matter Intake synthetic test failed",
      description: "Regression pack failed the Happy path test case.",
      suggested_action: "Expected field result to exist.",
      reportable: true,
      last_seen_at: "2026-06-15T20:00:00.000Z",
      occurrence_count: 1,
    });
  });

  it("updates the existing active issue when a synthetic test case fails again", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const supabase = createSyntheticIssueSupabase({
      activeIssue: { id: "issue-1", occurrence_count: 2 },
      updates,
      inserts,
    });

    const result = await syncSyntheticIssueForTestRun({
      supabase,
      now: "2026-06-15T20:00:00.000Z",
      context: buildContext({
        testRunId: "test-run-repeat",
        status: "failed",
        errorMessage: "Expected field result to exist.",
      }),
    });

    expect(result).toEqual({ id: "issue-1", created: false });
    expect(inserts).toEqual([]);
    expect(updates).toContainEqual({
      test_run_id: "test-run-repeat",
      severity: "medium",
      title: "Matter Intake synthetic test failed",
      description: "Regression pack failed the Happy path test case.",
      suggested_action: "Expected field result to exist.",
      reportable: true,
      last_seen_at: "2026-06-15T20:00:00.000Z",
      occurrence_count: 3,
    });
  });

  it("resolves the active synthetic issue when the same test case later passes", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const supabase = createSyntheticIssueSupabase({
      activeIssue: { id: "issue-1", occurrence_count: 2 },
      updates,
      inserts,
    });

    const result = await syncSyntheticIssueForTestRun({
      supabase,
      now: "2026-06-15T20:00:00.000Z",
      context: {
        ...buildContext({ testRunId: "test-run-pass", status: "passed" }),
      },
    });

    expect(result).toEqual({ id: "issue-1", resolved: true });
    expect(inserts).toEqual([]);
    expect(updates).toContainEqual({
      test_run_id: "test-run-pass",
      status: "resolved",
      resolved_at: "2026-06-15T20:00:00.000Z",
      resolution_note: "Synthetic test passed on rerun.",
      reportable: true,
    });
  });

  it("does not resolve active issues for skipped synthetic runs", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const supabase = createSyntheticIssueSupabase({
      activeIssue: { id: "issue-1", occurrence_count: 2 },
      updates,
      inserts,
    });

    const result = await syncSyntheticIssueForTestRun({
      supabase,
      now: "2026-06-15T20:00:00.000Z",
      context: buildContext({ status: "skipped" }),
    });

    expect(result).toBeNull();
    expect(inserts).toEqual([]);
    expect(updates).toEqual([]);
  });
});

function buildContext(
  overrides: Partial<Parameters<typeof syncSyntheticIssueForTestRun>[0]["context"]> = {},
): Parameters<typeof syncSyntheticIssueForTestRun>[0]["context"] {
  return {
    agencyId: "agency-1",
    clientId: "client-1",
    workflowId: "workflow-1",
    workflowName: "Matter Intake",
    testPackId: "pack-1",
    testPackName: "Regression pack",
    testCaseId: "case-1",
    testCaseName: "Happy path",
    testRunId: "test-run-1",
    status: "passed",
    ...overrides,
  };
}

function createSyntheticIssueSupabase({
  activeIssue,
  updates,
  inserts,
}: {
  activeIssue: { id: string; occurrence_count: number | null } | null;
  updates: unknown[];
  inserts: unknown[];
}) {
  return {
    from(table: string) {
      if (table !== "issues") {
        throw new Error(`Unexpected table ${table}`);
      }

      return createIssueQuery({ activeIssue, updates, inserts });
    },
  } as never;
}

function createIssueQuery({
  activeIssue,
  updates,
  inserts,
}: {
  activeIssue: { id: string; occurrence_count: number | null } | null;
  updates: unknown[];
  inserts: unknown[];
}) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
    async maybeSingle() {
      return { data: activeIssue, error: null };
    },
    update(payload: unknown) {
      updates.push(payload);
      return {
        eq() {
          return this;
        },
        select() {
          return this;
        },
        async single() {
          return { data: { id: activeIssue?.id }, error: null };
        },
      };
    },
    insert(payload: unknown) {
      inserts.push(payload);
      return {
        select() {
          return this;
        },
        async single() {
          return { data: { id: "inserted-issue" }, error: null };
        },
      };
    },
  };
}
