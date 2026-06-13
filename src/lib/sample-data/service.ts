"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth/workspace";
import { buildSampleDataSeed, type SampleDataIds } from "@/lib/sample-data/seed";
import { createClient } from "@/lib/supabase/server";

export async function seedSampleDataAction() {
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const agencyId = workspace.agency.id;
  const { data: agencyRow, error: agencyError } = await supabase
    .from("agencies")
    .select("sample_data_seeded_at")
    .eq("id", agencyId)
    .maybeSingle();

  if (agencyError) {
    redirect(`/?error=${encodeURIComponent(agencyError.message)}`);
  }

  if (agencyRow?.sample_data_seeded_at) {
    redirect("/?sample=already");
  }

  const seed = buildSampleDataSeed({
    agencyId,
    now: new Date(),
    ids: buildSampleDataIds(agencyId),
  });

  const operations = [
    supabase.from("clients").upsert(seed.client),
    supabase.from("workflows").upsert(seed.workflow),
    supabase.from("checks").upsert(seed.check),
    supabase.from("check_runs").upsert(seed.checkRuns),
    supabase.from("issues").upsert(seed.issue),
    supabase.from("test_packs").upsert(seed.testPack),
    supabase.from("test_cases").upsert(seed.testCase),
    supabase.from("test_runs").upsert(seed.testRun),
    supabase.from("reports").upsert(seed.report),
    supabase.from("report_items").upsert(seed.reportItems),
    supabase
      .from("agencies")
      .update({ sample_data_seeded_at: new Date().toISOString() })
      .eq("id", agencyId),
  ];

  for (const operation of operations) {
    const { error } = await operation;

    if (error) {
      redirect(`/?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/workflows");
  revalidatePath("/checks");
  revalidatePath("/issues");
  revalidatePath("/reports");
  redirect("/?sample=seeded");
}

function buildSampleDataIds(agencyId: string): SampleDataIds {
  return {
    clientId: stableUuid(agencyId, "demo-client"),
    workflowId: stableUuid(agencyId, "demo-workflow"),
    checkId: stableUuid(agencyId, "demo-check"),
    healthyRunId: stableUuid(agencyId, "demo-healthy-run"),
    failedRunId: stableUuid(agencyId, "demo-failed-run"),
    issueId: stableUuid(agencyId, "demo-issue"),
    testPackId: stableUuid(agencyId, "demo-test-pack"),
    testCaseId: stableUuid(agencyId, "demo-test-case"),
    testRunId: stableUuid(agencyId, "demo-test-run"),
    reportId: stableUuid(agencyId, "demo-report"),
    reportItemIds: [
      stableUuid(agencyId, "demo-report-item-workflow"),
      stableUuid(agencyId, "demo-report-item-issue"),
      stableUuid(agencyId, "demo-report-item-qa"),
    ],
  };
}

function stableUuid(namespace: string, key: string): string {
  const hex = createHash("sha256").update(`${namespace}:${key}`).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.slice(18, 20),
    hex.slice(20, 32),
  ].join("-");
}
