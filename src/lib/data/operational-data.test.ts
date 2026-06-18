import { describe, expect, it } from "vitest";
import { getOperationalData, getReportSourceData } from "@/lib/data/operational-data";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

describe("getOperationalData", () => {
  it("applies the active agency boundary to every tenant-owned data set it loads", async () => {
    const { supabase, agencyFilters } = createTracingSupabaseStub();

    await getOperationalData(makeAgency(), supabase);

    expect(agencyFilters).toEqual({
      clients: ["agency-1"],
      workflows: ["agency-1"],
      checks: ["agency-1"],
      check_runs: ["agency-1"],
      issues: ["agency-1"],
      test_packs: ["agency-1"],
      test_cases: ["agency-1"],
      test_runs: ["agency-1"],
      workflow_api_keys: ["agency-1"],
      reports: ["agency-1"],
      report_items: ["agency-1"],
    });
  });

  it("does not invent a last check time for workflows without runs", async () => {
    const clientUpdatedAt = "2026-06-14T10:00:00.000Z";
    const data = await getOperationalData(makeAgency(), createSupabaseStub({
      clients: [
        {
          id: "client-1",
          agency_id: "agency-1",
          name: "Acme",
          slug: "acme",
          industry: "Services",
          report_recipient_email: "ops@example.invalid",
          report_automation_enabled: false,
          next_report_due_on: null,
          last_report_generated_at: null,
          notes: "",
          archived_at: null,
          created_at: "2026-06-14T09:00:00.000Z",
          updated_at: clientUpdatedAt,
        },
      ],
      workflows: [
        {
          id: "workflow-1",
          agency_id: "agency-1",
          client_id: "client-1",
          name: "Lead intake",
          type: "http_endpoint",
          environment: "production",
          endpoint_url: "https://example.com/health",
          method: "GET",
          auth_type: "none",
          check_frequency_minutes: 60,
          status: "unknown",
          pass_rate: 0,
          latency_ms: 0,
          monthly_cost: 0,
          last_check_at: null,
          included_in_reports: true,
          archived_at: null,
          created_at: "2026-06-14T09:05:00.000Z",
          updated_at: "2026-06-14T09:05:00.000Z",
        },
      ],
    }));

    expect(data.workflows[0]?.lastCheckAt).toBeUndefined();
    expect(data.clients[0]?.lastActivityAt).toBe(clientUpdatedAt);
  });

  it("loads uncapped client-period source rows for reports", async () => {
    const checkRuns = Array.from({ length: 125 }, (_, index) => ({
      id: `run-${index}`,
      agency_id: "agency-1",
      client_id: "client-1",
      workflow_id: "workflow-1",
      check_id: "check-1",
      status: "healthy",
      status_code: 200,
      latency_ms: 200,
      response_summary: "ok",
      error_message: null,
      cost_estimate: null,
      model: null,
      prompt_version: null,
      started_at: "2026-06-14T09:00:00.000Z",
      completed_at: "2026-06-14T09:00:01.000Z",
      created_at: "2026-06-14T09:00:01.000Z",
    }));
    const data = await getReportSourceData({
      agency: makeAgency(),
      clientId: "client-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      supabaseOverride: createSupabaseStub({
        clients: [
          {
            id: "client-1",
            agency_id: "agency-1",
            name: "Acme",
            slug: "acme",
            industry: "Services",
            report_recipient_email: "ops@example.invalid",
            report_automation_enabled: false,
            next_report_due_on: null,
            last_report_generated_at: null,
            notes: "",
            archived_at: null,
            created_at: "2026-06-14T09:00:00.000Z",
            updated_at: "2026-06-14T09:00:00.000Z",
          },
        ],
        workflows: [
          {
            id: "workflow-1",
            agency_id: "agency-1",
            client_id: "client-1",
            name: "Lead intake",
            type: "http_endpoint",
            environment: "production",
            endpoint_url: "https://example.com/health",
            method: "GET",
            auth_type: "none",
            check_frequency_minutes: 60,
            status: "healthy",
            pass_rate: 100,
            latency_ms: 200,
            monthly_cost: 0,
            last_check_at: "2026-06-14T09:00:01.000Z",
            included_in_reports: true,
            archived_at: null,
            created_at: "2026-06-14T09:00:00.000Z",
            updated_at: "2026-06-14T09:00:00.000Z",
          },
        ],
        checks: [
          {
            id: "check-1",
            agency_id: "agency-1",
            workflow_id: "workflow-1",
            name: "Health",
            type: "health",
            config_json: {
              timeoutMs: 10000,
              assertions: [{ type: "status_code", expected: 200 }],
            },
            enabled: true,
            schedule: "Every 60 minutes",
            created_at: "2026-06-14T09:00:00.000Z",
            updated_at: "2026-06-14T09:00:00.000Z",
          },
        ],
        check_runs: checkRuns,
        issues: [],
        test_packs: [],
        test_cases: [],
        test_runs: [],
      }),
    });

    expect(data.checkRuns).toHaveLength(125);
    expect(data.reports).toEqual([]);
    expect(data.reportItems).toEqual([]);
  });
});

function makeAgency(): TuesdayOpsSeedData["agency"] {
  return {
    id: "agency-1",
    name: "Northstar Automation",
    slug: "northstar",
    primaryColor: "#7C6CF2",
    plan: "starter",
    billingStatus: "trialing",
  };
}

function createSupabaseStub(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      return createQuery({ data: tables[table] ?? [], error: null });
    },
  } as never;
}

function createTracingSupabaseStub() {
  const agencyFilters: Record<string, string[]> = {};
  const supabase = {
    from(table: string) {
      return createTracingQuery({
        data: [],
        error: null,
        onEq(column, value) {
          if (column === "agency_id") {
            agencyFilters[table] = [...(agencyFilters[table] ?? []), String(value)];
          }
        },
      });
    },
  } as never;

  return { supabase, agencyFilters };
}

function createTracingQuery(result: {
  data: unknown[];
  error: null;
  onEq: (column: string, value: unknown) => void;
}) {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      result.onEq(column, value);
      return query;
    },
    is: () => query,
    in: () => query,
    gte: () => query,
    lte: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({ data: result.data[0] ?? null, error: result.error }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result.data, error: result.error }).then(resolve, reject),
  };

  return query;
}

function createQuery(result: { data: unknown[]; error: null }) {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    in: () => query,
    gte: () => query,
    lte: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({ data: result.data[0] ?? null, error: result.error }),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}
