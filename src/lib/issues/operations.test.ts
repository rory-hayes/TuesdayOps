import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendIssueAlertForNewIssue } from "@/lib/alerts/service";
import { createOrUpdateIssueForCheckRun, type IssueRunContext } from "@/lib/issues/operations";

vi.mock("@/lib/alerts/service", () => ({
  sendIssueAlertForNewIssue: vi.fn(),
}));

const failedContext: IssueRunContext = {
  agencyId: "agency-1",
  clientId: "client-1",
  workflowId: "workflow-1",
  workflowName: "Risk Router",
  checkId: "check-1",
  checkName: "Endpoint health",
  checkRunId: "run-1",
  status: "failed",
  statusCode: 500,
  latencyMs: 250,
  assertionResults: [
    {
      type: "status_code",
      passed: false,
      message: "Expected HTTP 200 but received HTTP 500.",
    },
  ],
};

describe("createOrUpdateIssueForCheckRun", () => {
  beforeEach(() => {
    vi.mocked(sendIssueAlertForNewIssue).mockReset();
    vi.mocked(sendIssueAlertForNewIssue).mockResolvedValue({ status: "sent", deliveryId: "email-1" });
  });

  it("does not touch issue storage for healthy runs", async () => {
    const { supabase, from } = createIssueSupabase();

    await expect(
      createOrUpdateIssueForCheckRun({
        supabase,
        context: {
          ...failedContext,
          status: "healthy",
          statusCode: 200,
          assertionResults: [{ type: "status_code", passed: true, message: "Expected HTTP 200." }],
        },
      }),
    ).resolves.toBeNull();

    expect(from).not.toHaveBeenCalled();
    expect(sendIssueAlertForNewIssue).not.toHaveBeenCalled();
  });

  it("creates a new active issue and sends the first alert", async () => {
    const { supabase, insertedIssues } = createIssueSupabase({
      findResponses: [{ data: null, error: null }],
      insertResponse: { data: { id: "issue-1" }, error: null },
    });

    await expect(
      createOrUpdateIssueForCheckRun({ supabase, context: failedContext }),
    ).resolves.toEqual({ id: "issue-1", created: true });

    expect(insertedIssues).toContainEqual(
      expect.objectContaining({
        agency_id: "agency-1",
        client_id: "client-1",
        workflow_id: "workflow-1",
        check_run_id: "run-1",
        severity: "high",
        status: "open",
        title: "Risk Router returned HTTP 500",
        occurrence_count: 1,
      }),
    );
    expect(sendIssueAlertForNewIssue).toHaveBeenCalledWith({
      supabase,
      issueId: "issue-1",
      created: true,
      draft: expect.objectContaining({
        title: "Risk Router returned HTTP 500",
        severity: "high",
      }),
      context: failedContext,
    });
  });

  it("updates an existing active issue for repeat failures", async () => {
    const { supabase, insertedIssues, updatedIssues } = createIssueSupabase({
      findResponses: [{ data: { id: "issue-1", occurrence_count: 3 }, error: null }],
      updateResponse: { data: { id: "issue-1" }, error: null },
    });

    await expect(
      createOrUpdateIssueForCheckRun({ supabase, context: failedContext }),
    ).resolves.toEqual({ id: "issue-1", created: false });

    expect(insertedIssues).toEqual([]);
    expect(updatedIssues).toContainEqual(
      expect.objectContaining({
        check_run_id: "run-1",
        occurrence_count: 4,
        title: "Risk Router returned HTTP 500",
      }),
    );
    expect(sendIssueAlertForNewIssue).not.toHaveBeenCalled();
  });

  it("retries lookup and updates when a concurrent insert wins the unique fingerprint race", async () => {
    const { supabase, updatedIssues } = createIssueSupabase({
      findResponses: [
        { data: null, error: null },
        { data: { id: "issue-2", occurrence_count: null }, error: null },
      ],
      insertResponse: { data: null, error: { code: "23505", message: "duplicate key" } },
      updateResponse: { data: { id: "issue-2" }, error: null },
    });

    await expect(
      createOrUpdateIssueForCheckRun({ supabase, context: failedContext }),
    ).resolves.toEqual({ id: "issue-2", created: false });

    expect(updatedIssues).toContainEqual(expect.objectContaining({ occurrence_count: 2 }));
    expect(sendIssueAlertForNewIssue).not.toHaveBeenCalled();
  });

  it("surfaces duplicate insert errors when the retry cannot find the winner", async () => {
    await expect(
      createOrUpdateIssueForCheckRun({
        supabase: createIssueSupabase({
          findResponses: [
            { data: null, error: null },
            { data: null, error: null },
          ],
          insertResponse: { data: null, error: { code: "23505", message: "duplicate key" } },
        }).supabase,
        context: failedContext,
      }),
    ).rejects.toThrow("Unable to create issue: duplicate key");
  });

  it("returns a created result without alerting when Supabase returns no inserted id", async () => {
    const { supabase } = createIssueSupabase({
      findResponses: [{ data: null, error: null }],
      insertResponse: { data: null, error: null },
    });

    await expect(
      createOrUpdateIssueForCheckRun({ supabase, context: failedContext }),
    ).resolves.toEqual({ id: undefined, created: true });
    expect(sendIssueAlertForNewIssue).not.toHaveBeenCalled();
  });

  it("surfaces issue lookup, insert, and update failures", async () => {
    await expect(
      createOrUpdateIssueForCheckRun({
        supabase: createIssueSupabase({
          findResponses: [{ data: null, error: { message: "lookup failed" } }],
        }).supabase,
        context: failedContext,
      }),
    ).rejects.toThrow("Unable to check active issues: lookup failed");

    await expect(
      createOrUpdateIssueForCheckRun({
        supabase: createIssueSupabase({
          findResponses: [{ data: null, error: null }],
          insertResponse: { data: null, error: { code: "42501", message: "insert denied" } },
        }).supabase,
        context: failedContext,
      }),
    ).rejects.toThrow("Unable to create issue: insert denied");

    await expect(
      createOrUpdateIssueForCheckRun({
        supabase: createIssueSupabase({
          findResponses: [{ data: { id: "issue-1", occurrence_count: 1 }, error: null }],
          updateResponse: { data: null, error: { message: "update denied" } },
        }).supabase,
        context: failedContext,
      }),
    ).rejects.toThrow("Unable to update issue: update denied");
  });
});

function createIssueSupabase({
  findResponses = [{ data: null, error: null }],
  insertResponse = { data: { id: "issue-1" }, error: null },
  updateResponse = { data: { id: "issue-1" }, error: null },
}: {
  findResponses?: Array<{
    data: { id: string; occurrence_count: number | null } | null;
    error: { message: string } | null;
  }>;
  insertResponse?: {
    data: { id: string } | null;
    error: { code?: string; message: string } | null;
  };
  updateResponse?: {
    data: { id: string } | null;
    error: { message: string } | null;
  };
} = {}) {
  const insertedIssues: unknown[] = [];
  const updatedIssues: unknown[] = [];
  const from = vi.fn((table: string) => {
    if (table !== "issues") {
      throw new Error(`Unexpected table ${table}`);
    }

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
      maybeSingle: async () => findResponses.shift() ?? { data: null, error: null },
      insert(payload: unknown) {
        insertedIssues.push(payload);

        return {
          select() {
            return this;
          },
          single: async () => insertResponse,
        };
      },
      update(payload: unknown) {
        updatedIssues.push(payload);

        return {
          eq() {
            return this;
          },
          select() {
            return this;
          },
          single: async () => updateResponse,
        };
      },
    };
  });

  return { supabase: { from } as never, from, insertedIssues, updatedIssues };
}
