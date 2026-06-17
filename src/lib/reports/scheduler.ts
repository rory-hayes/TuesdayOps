import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agency, Client } from "@/lib/domain/types";
import { getReportSourceData } from "@/lib/data/operational-data";
import { buildReportDraft } from "@/lib/reports/aggregation";
import { saveReportDraft } from "@/lib/reports/service";

type DueClientRow = {
  id: string;
  agency_id: string;
  report_automation_enabled: boolean | null;
  next_report_due_on: string | null;
};

type AgencyRow = {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  plan: string;
  billing_status: string;
};

export type MonthlyReportSchedulerResult = {
  attempted: number;
  generated: number;
  skipped: number;
  failed: number;
};

export function getPreviousMonthReportPeriod(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    period: start.toISOString().slice(0, 7),
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

export function buildNextMonthlyReportDueOn(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

export function shouldGenerateAutomatedReport({
  reportAutomationEnabled,
  nextReportDueOn,
  today,
}: {
  reportAutomationEnabled: boolean;
  nextReportDueOn?: string | null;
  today: string;
}): boolean {
  return reportAutomationEnabled && Boolean(nextReportDueOn) && String(nextReportDueOn) <= today;
}

export async function runDueMonthlyReports({
  supabase,
  now = new Date(),
}: {
  supabase: SupabaseClient;
  now?: Date;
}): Promise<MonthlyReportSchedulerResult> {
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("clients")
    .select("id, agency_id, report_automation_enabled, next_report_due_on")
    .is("archived_at", null)
    .eq("report_automation_enabled", true)
    .lte("next_report_due_on", today);

  if (error) {
    throw new Error(`Due report clients could not be loaded: ${error.message}`);
  }

  const clients = ((data ?? []) as DueClientRow[]).filter((client) =>
    shouldGenerateAutomatedReport({
      reportAutomationEnabled: Boolean(client.report_automation_enabled),
      nextReportDueOn: client.next_report_due_on,
      today,
    }),
  );
  const result: MonthlyReportSchedulerResult = {
    attempted: clients.length,
    generated: 0,
    skipped: 0,
    failed: 0,
  };
  const period = getPreviousMonthReportPeriod(now);
  const nextDue = buildNextMonthlyReportDueOn(now);

  for (const client of clients) {
    try {
      const agency = await loadAgency({ supabase, agencyId: client.agency_id });
      const dataSnapshot = await getReportSourceData({
        agency: mapAgency(agency),
        clientId: client.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        supabaseOverride: supabase,
      });
      const activeClient = dataSnapshot.clients.find((candidate: Client) => candidate.id === client.id);

      if (!activeClient) {
        result.skipped += 1;
        continue;
      }

      const draft = buildReportDraft({
        data: dataSnapshot,
        clientId: client.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      });

      await saveReportDraft({
        supabase,
        agencyId: client.agency_id,
        draft,
      });
      await supabase
        .from("clients")
        .update({
          last_report_generated_at: now.toISOString(),
          next_report_due_on: nextDue,
        })
        .eq("agency_id", client.agency_id)
        .eq("id", client.id);
      result.generated += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

async function loadAgency({
  supabase,
  agencyId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
}) {
  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, slug, primary_color, plan, billing_status")
    .eq("id", agencyId)
    .single();

  if (error || !data) {
    throw new Error(`Agency could not be loaded: ${error?.message ?? "Unknown database error."}`);
  }

  return data as AgencyRow;
}

function mapAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    primaryColor: row.primary_color,
    plan: row.plan,
    billingStatus: row.billing_status,
  };
}
