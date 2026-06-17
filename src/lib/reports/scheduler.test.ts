import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/operational-data", () => ({
  getReportSourceData: vi.fn(),
}));
vi.mock("@/lib/reports/aggregation", () => ({
  buildReportDraft: vi.fn(),
}));
vi.mock("@/lib/reports/service", () => ({
  saveReportDraft: vi.fn(),
}));

import { getReportSourceData } from "@/lib/data/operational-data";
import { buildReportDraft } from "@/lib/reports/aggregation";
import { saveReportDraft } from "@/lib/reports/service";
import {
  buildNextMonthlyReportDueOn,
  getPreviousMonthReportPeriod,
  runDueMonthlyReports,
  shouldGenerateAutomatedReport,
} from "./scheduler";

describe("monthly report automation helpers", () => {
  beforeEach(() => {
    vi.mocked(getReportSourceData).mockReset();
    vi.mocked(buildReportDraft).mockReset();
    vi.mocked(saveReportDraft).mockReset();
  });

  it("generates drafts for the previous completed calendar month", () => {
    expect(getPreviousMonthReportPeriod(new Date("2026-06-16T12:00:00.000Z"))).toEqual({
      period: "2026-05",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
    });
  });

  it("schedules the next report for the first day of the next month", () => {
    expect(buildNextMonthlyReportDueOn(new Date("2026-06-16T12:00:00.000Z"))).toBe("2026-07-01");
  });

  it("selects only enabled clients whose due date has arrived", () => {
    expect(shouldGenerateAutomatedReport({
      reportAutomationEnabled: true,
      nextReportDueOn: "2026-06-01",
      today: "2026-06-16",
    })).toBe(true);
    expect(shouldGenerateAutomatedReport({
      reportAutomationEnabled: true,
      nextReportDueOn: "2026-07-01",
      today: "2026-06-16",
    })).toBe(false);
    expect(shouldGenerateAutomatedReport({
      reportAutomationEnabled: false,
      nextReportDueOn: "2026-06-01",
      today: "2026-06-16",
    })).toBe(false);
  });

  it("generates due report drafts and advances the client schedule", async () => {
    const supabase = createMonthlyReportSupabaseStub({
      dueClients: [{
        id: "client-1",
        agency_id: "agency-1",
        report_automation_enabled: true,
        next_report_due_on: "2026-06-01",
      }],
      agency: {
        id: "agency-1",
        name: "Acme Ops",
        slug: "acme-ops",
        primary_color: "#7C6CF2",
        plan: "design_partner",
        billing_status: "active",
      },
    });
    const dataSnapshot = { clients: [{ id: "client-1", name: "Acme Client" }] };
    const draft = { report: { clientId: "client-1" }, items: [] };

    vi.mocked(getReportSourceData).mockResolvedValue(dataSnapshot as never);
    vi.mocked(buildReportDraft).mockReturnValue(draft as never);
    vi.mocked(saveReportDraft).mockResolvedValue("report-1" as never);

    await expect(runDueMonthlyReports({
      supabase: supabase.client,
      now: new Date("2026-06-16T12:00:00.000Z"),
    })).resolves.toEqual({
      attempted: 1,
      generated: 1,
      skipped: 0,
      failed: 0,
    });

    expect(getReportSourceData).toHaveBeenCalledWith({
      agency: expect.objectContaining({
        id: "agency-1",
        name: "Acme Ops",
      }),
      clientId: "client-1",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      supabaseOverride: supabase.client,
    });
    expect(buildReportDraft).toHaveBeenCalledWith({
      data: dataSnapshot,
      clientId: "client-1",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
    });
    expect(saveReportDraft).toHaveBeenCalledWith({
      supabase: supabase.client,
      agencyId: "agency-1",
      draft,
    });
    expect(supabase.clientUpdates).toEqual([{
      agencyId: "agency-1",
      clientId: "client-1",
      payload: {
        last_report_generated_at: "2026-06-16T12:00:00.000Z",
        next_report_due_on: "2026-07-01",
      },
    }]);
  });
});

type DueClientRow = {
  id: string;
  agency_id: string;
  report_automation_enabled: boolean;
  next_report_due_on: string;
};

type AgencyRow = {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  plan: string;
  billing_status: string;
};

function createMonthlyReportSupabaseStub({
  dueClients,
  agency,
}: {
  dueClients: DueClientRow[];
  agency: AgencyRow;
}) {
  const clientUpdates: Array<{
    agencyId?: string;
    clientId?: string;
    payload: Record<string, unknown>;
  }> = [];
  const client = {
    from(table: string) {
      if (table === "clients") {
        return {
          select: () => ({
            is: () => ({
              eq: () => ({
                lte: async () => ({ data: dueClients, error: null }),
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            const update = {
              payload,
              agencyId: undefined as string | undefined,
              clientId: undefined as string | undefined,
              eq(column: string, value: string) {
                if (column === "agency_id") {
                  update.agencyId = value;
                }
                if (column === "id") {
                  update.clientId = value;
                }
                return update;
              },
              then(resolve: (value: { data: null; error: null }) => void) {
                clientUpdates.push({
                  agencyId: update.agencyId,
                  clientId: update.clientId,
                  payload: update.payload,
                });
                resolve({ data: null, error: null });
              },
            };

            return update;
          },
        };
      }

      if (table === "agencies") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: agency, error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    client: client as never,
    clientUpdates,
  };
}
