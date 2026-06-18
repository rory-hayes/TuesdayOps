import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase", "migrations");

function readMigration(name: string): string {
  return readFileSync(join(migrationsDir, name), "utf8").replace(/\s+/g, " ");
}

function readAllMigrations(): string {
  return readFileSync(join(migrationsDir, "20260613111357_milestones_1_3.sql"), "utf8")
    .concat("\n", readFileSync(join(migrationsDir, "20260613162243_test_packs.sql"), "utf8"))
    .concat("\n", readFileSync(join(migrationsDir, "20260613165022_reports.sql"), "utf8"))
    .concat("\n", readFileSync(join(migrationsDir, "20260614130339_code_hardening_foundation.sql"), "utf8"))
    .concat("\n", readFileSync(join(migrationsDir, "20260616193000_design_partner_readiness_lifecycle.sql"), "utf8"))
    .concat("\n", readFileSync(join(migrationsDir, "20260617195500_core_loop_production_blockers.sql"), "utf8"))
    .concat("\n", readFileSync(join(migrationsDir, "20260618120000_tenant_issue_check_run_boundary.sql"), "utf8"))
    .replace(/\s+/g, " ");
}

describe("tenant isolation migration contract", () => {
  it("enables RLS and member-scoped policies for tenant-owned core-loop tables", () => {
    const sql = readAllMigrations();
    const tables = [
      "clients",
      "workflows",
      "checks",
      "check_runs",
      "issues",
      "test_packs",
      "test_cases",
      "test_runs",
      "reports",
      "report_items",
      "workflow_api_keys",
      "audit_events",
    ];

    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }

    for (const table of [
      "clients",
      "workflows",
      "checks",
      "check_runs",
      "issues",
      "test_packs",
      "test_cases",
      "test_runs",
      "reports",
      "report_items",
    ]) {
      expect(sql).toContain(`on public.${table}`);
      expect(sql).toContain("using (public.is_agency_member(agency_id))");
      expect(sql).toContain("with check (public.is_agency_member(agency_id))");
    }
  });

  it("uses composite agency foreign keys for core-loop child records", () => {
    const sql = readAllMigrations();
    const expectedCompositeKeys = [
      "constraint workflows_client_agency_fk foreign key (client_id, agency_id)",
      "constraint checks_workflow_agency_fk foreign key (workflow_id, agency_id)",
      "constraint check_runs_client_agency_fk foreign key (client_id, agency_id)",
      "constraint check_runs_workflow_agency_fk foreign key (workflow_id, agency_id)",
      "constraint check_runs_check_agency_fk foreign key (check_id, agency_id)",
      "constraint issues_client_agency_fk foreign key (client_id, agency_id)",
      "constraint issues_workflow_agency_fk foreign key (workflow_id, agency_id)",
      "constraint issues_check_run_agency_fk foreign key (check_run_id, agency_id)",
      "constraint test_packs_workflow_agency_fk foreign key (workflow_id, agency_id)",
      "constraint test_cases_pack_agency_fk foreign key (test_pack_id, agency_id)",
      "constraint test_cases_workflow_agency_fk foreign key (workflow_id, agency_id)",
      "constraint test_runs_workflow_agency_fk foreign key (workflow_id, agency_id)",
      "constraint test_runs_pack_agency_fk foreign key (test_pack_id, agency_id)",
      "constraint test_runs_case_agency_fk foreign key (test_case_id, agency_id)",
      "constraint issues_test_run_agency_fk foreign key (test_run_id, agency_id)",
      "constraint reports_client_agency_fk foreign key (client_id, agency_id)",
      "constraint report_items_report_agency_fk foreign key (report_id, agency_id)",
      "constraint workflow_api_keys_workflow_agency_fk foreign key (workflow_id, agency_id)",
    ];

    for (const expected of expectedCompositeKeys) {
      expect(sql).toContain(expected);
    }
  });

  it("keeps report PDFs private and service-routed by agency/report storage paths", () => {
    const reportsSql = readMigration("20260613165022_reports.sql");

    expect(reportsSql).toContain("insert into storage.buckets (id, name, public) values ('reports', 'reports', false)");
    expect(reportsSql).toContain("pdf_storage_path text");
  });
});
