import { beforeEach, describe, expect, it, vi } from "vitest";
import * as reportService from "@/lib/reports/service";
import { createClient } from "@/lib/supabase/server";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  requireWorkspace: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(() => ({ from: vi.fn(), storage: { from: vi.fn() } })),
  recordAuditEvent: vi.fn(),
  sendResendEmail: vi.fn(),
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/audit/events", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

vi.mock("@/lib/alerts/resend", () => ({
  sendResendEmail: mocks.sendResendEmail,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertPersistentRateLimit: mocks.assertPersistentRateLimit,
}));

const workspace = {
  agency: { id: "agency-1" },
  user: { id: "user-1" },
};

describe("report server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspace.mockResolvedValue(workspace);
  });

  it("saves edited report narrative inside the tenant boundary and clears stale PDF state", async () => {
    const supabase = createReportActionSupabaseStub();
    mocks.createClient.mockResolvedValue(supabase.client);
    const action = (reportService as unknown as {
      updateReportNarrativeAction?: (formData: FormData) => Promise<void>;
    }).updateReportNarrativeAction;

    expect(typeof action).toBe("function");

    await expectRedirect(
      action?.(formData({
        reportId: reportId(),
        summary: "June proof summary for the client. Bearer token_123",
        recommendations: "Keep monitoring cadence.\ntoken=plain-secret\n\n",
        reportItemId: ["item-1"],
        reportItemCategory: ["workflow_health"],
        reportItemSortOrder: ["10"],
        reportItemTitle: ["Workflow health overview"],
        reportItemBody: ["The endpoint stayed healthy. api_key=secret-value"],
      })) ?? Promise.resolve(),
      `/reports/${reportId()}?notice=Report%20narrative%20saved.`,
    );

    expect(supabase.updates).toContainEqual({
      table: "reports",
      payload: {
        summary: "June proof summary for the client. Bearer [redacted]",
        recommendations_json: ["Keep monitoring cadence.", "token=[redacted]"],
        status: "draft",
        pdf_url: null,
        pdf_storage_path: null,
        email_delivery_id: null,
        send_error: null,
      },
      filters: [
        ["agency_id", "agency-1"],
        ["id", reportId()],
      ],
    });
    expect(supabase.deletes).toContainEqual({
      table: "report_items",
      filters: [
        ["agency_id", "agency-1"],
        ["report_id", reportId()],
      ],
    });
    expect(supabase.inserts).toContainEqual({
      table: "report_items",
      payload: [{
        agency_id: "agency-1",
        report_id: reportId(),
        category: "workflow_health",
        title: "Workflow health overview",
        body: "The endpoint stayed healthy. api_key=[redacted]",
        sort_order: 10,
      }],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/reports");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/reports/${reportId()}`);
  });
});

async function expectRedirect(action: Promise<void>, url: string) {
  await expect(action).rejects.toThrow(`NEXT_REDIRECT:${url}`);
}

function reportId() {
  return "22222222-2222-4222-8222-222222222222";
}

function formData(values: Record<string, string | string[]>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        data.append(key, item);
      }
    } else {
      data.set(key, value);
    }
  }

  return data;
}

function createReportActionSupabaseStub({
  mutationResult = { data: { id: reportId() }, error: null },
}: {
  mutationResult?: { data: { id: string } | null; error: { message: string } | null };
} = {}) {
  const updates: Array<{
    table: string;
    payload: unknown;
    filters: Array<[string, unknown]>;
  }> = [];
  const deletes: Array<{
    table: string;
    filters: Array<[string, unknown]>;
  }> = [];
  const inserts: Array<{
    table: string;
    payload: unknown;
  }> = [];
  const client = {
    from(table: string) {
      return createReportActionQuery({
        table,
        updates,
        deletes,
        inserts,
        mutationResult,
      });
    },
  };

  return {
    client: client as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    updates,
    deletes,
    inserts,
  };
}

function createReportActionQuery({
  table,
  updates,
  deletes,
  inserts,
  mutationResult,
}: {
  table: string;
  updates: Array<{ table: string; payload: unknown; filters: Array<[string, unknown]> }>;
  deletes: Array<{ table: string; filters: Array<[string, unknown]> }>;
  inserts: Array<{ table: string; payload: unknown }>;
  mutationResult: { data: { id: string } | null; error: { message: string } | null };
}) {
  const filters: Array<[string, unknown]> = [];
  let updatePayload: unknown;
  let deleteRequested = false;

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
    delete() {
      deleteRequested = true;
      return query;
    },
    insert(payload: unknown) {
      inserts.push({ table, payload });
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle: async () => {
      if (updatePayload !== undefined) {
        updates.push({ table, payload: updatePayload, filters: [...filters] });
      }

      return mutationResult;
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      if (deleteRequested) {
        deletes.push({ table, filters: [...filters] });
      }

      resolve({ data: null, error: null });
    },
  };

  return query;
}
