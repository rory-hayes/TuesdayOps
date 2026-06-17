import { describe, expect, it } from "vitest";
import { getOperationalData } from "@/lib/data/operational-data";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

describe("getOperationalData", () => {
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

function createQuery(result: { data: unknown[]; error: null }) {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}
