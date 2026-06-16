"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import { runHttpCheck, type WorkflowAuthConfig } from "@/lib/checks/runner";
import { decryptJsonPayload, type EncryptedJsonPayload } from "@/lib/security/secrets";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncSyntheticIssueForTestRun } from "@/lib/test-packs/issues";
import {
  buildTestCaseArchiveUpdate,
  buildTestCaseUpdate,
  buildTestPackDisableUpdate,
  buildTestPackUpdate,
} from "@/lib/test-packs/lifecycle";
import {
  buildSyntheticRunConfig,
  buildTestCaseAssertions,
  buildTestRunInsert,
  parseJsonInput,
  type TestRunStatus,
} from "@/lib/test-packs/runner";

const createTestPackFormSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).optional(),
});

const createTestCaseFormSchema = z.object({
  testPackId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  inputJson: z.string().trim().optional(),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  maxLatencyMs: z.coerce.number().int().min(100).max(60000).default(10000),
  fieldExistsPath: z.string().trim().max(120).optional(),
  notContainsValue: z.string().trim().max(120).optional(),
});

const runTestPackFormSchema = z.object({
  testPackId: z.string().uuid(),
});

const updateTestPackFormSchema = createTestPackFormSchema
  .omit({ workflowId: true })
  .extend({
    testPackId: z.string().uuid(),
  });

const testCaseIdFormSchema = z.object({
  testCaseId: z.string().uuid(),
});

const updateTestCaseFormSchema = createTestCaseFormSchema
  .omit({ testPackId: true })
  .extend({
    testCaseId: z.string().uuid(),
  });

type TestPackRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  name: string;
  description: string;
  enabled: boolean;
};

type TestCaseRow = {
  id: string;
  agency_id: string;
  workflow_id: string;
  test_pack_id: string;
  name: string;
  input_json: unknown;
  assertions_json: unknown;
};

type TestWorkflowRow = {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  endpoint_url: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  auth_type: "none" | "bearer" | "api_key_header" | "basic";
  encrypted_auth_config: EncryptedJsonPayload | null;
};

export async function createTestPackAction(formData: FormData) {
  const parsed = createTestPackFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test pack details did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.from("test_packs").insert({
    agency_id: workspace.agency.id,
    workflow_id: parsed.data.workflowId,
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    enabled: true,
  });

  if (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test pack could not be created."))}`);
  }

  revalidatePath("/checks");
  redirect(`/checks?notice=${encodeURIComponent("Test pack added.")}`);
}

export async function createTestCaseAction(formData: FormData) {
  const parsed = createTestCaseFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test case details did not pass validation.")}`);
  }

  let inputJson: unknown;

  try {
    inputJson = parseJsonInput(parsed.data.inputJson ?? "");
  } catch {
    redirect(`/checks?error=${encodeURIComponent("Test case input must be valid JSON.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  let pack: TestPackRow;
  try {
    pack = await loadTestPack({
      supabase,
      agencyId: workspace.agency.id,
      testPackId: parsed.data.testPackId,
    });
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test case could not be created."))}`);
  }
  const assertions = buildTestCaseAssertions({
    expectedStatus: parsed.data.expectedStatus,
    maxLatencyMs: parsed.data.maxLatencyMs,
    fieldExistsPath: parsed.data.fieldExistsPath,
    notContainsValue: parsed.data.notContainsValue,
  });

  const { error } = await supabase.from("test_cases").insert({
    agency_id: workspace.agency.id,
    workflow_id: pack.workflow_id,
    test_pack_id: pack.id,
    name: parsed.data.name,
    input_json: inputJson,
    assertions_json: assertions,
  });

  if (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test case could not be created."))}`);
  }

  revalidatePath("/checks");
  redirect(`/checks?notice=${encodeURIComponent("Test case added.")}`);
}

export async function runTestPackAction(formData: FormData) {
  const parsed = runTestPackFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test pack id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();

  try {
    await executeTestPackRun({
      supabase,
      agencyId: workspace.agency.id,
      testPackId: parsed.data.testPackId,
    });
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test pack run failed."))}`);
  }

  revalidatePath("/checks");
  revalidatePath("/issues");
  revalidatePath("/workflows");
  revalidatePath("/");
  redirect(`/checks?notice=${encodeURIComponent("Test pack run completed.")}`);
}

export async function updateTestPackAction(formData: FormData) {
  const parsed = updateTestPackFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test pack update did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const updateResult = await supabase
    .from("test_packs")
    .update(buildTestPackUpdate({
      name: parsed.data.name,
      description: parsed.data.description,
    }))
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.testPackId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Test pack was not found or is not accessible.");
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test pack could not be saved."))}`);
  }

  await recordTestPackAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    action: "test_pack.updated",
    targetId: parsed.data.testPackId,
  });

  revalidatePath("/checks");
  redirect(`/checks?notice=${encodeURIComponent("Test pack saved.")}`);
}

export async function disableTestPackAction(formData: FormData) {
  const parsed = runTestPackFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test pack id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const disableResult = await supabase
    .from("test_packs")
    .update(buildTestPackDisableUpdate())
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.testPackId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(disableResult, "Test pack was not found or is not accessible.");
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test pack could not be disabled."))}`);
  }

  await recordTestPackAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    action: "test_pack.disabled",
    targetId: parsed.data.testPackId,
  });

  revalidatePath("/checks");
  redirect(`/checks?notice=${encodeURIComponent("Test pack disabled. Historical synthetic runs were preserved.")}`);
}

export async function updateTestCaseAction(formData: FormData) {
  const parsed = updateTestCaseFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test case update did not pass validation.")}`);
  }

  let inputJson: unknown;

  try {
    inputJson = parseJsonInput(parsed.data.inputJson ?? "");
  } catch {
    redirect(`/checks?error=${encodeURIComponent("Test case input must be valid JSON.")}`);
  }

  const assertions = buildTestCaseAssertions({
    expectedStatus: parsed.data.expectedStatus,
    maxLatencyMs: parsed.data.maxLatencyMs,
    fieldExistsPath: parsed.data.fieldExistsPath,
    notContainsValue: parsed.data.notContainsValue,
  });
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const updateResult = await supabase
    .from("test_cases")
    .update(buildTestCaseUpdate({
      name: parsed.data.name,
      inputJson,
      assertionsJson: assertions,
    }))
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.testCaseId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(updateResult, "Test case was not found or is not accessible.");
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test case could not be saved."))}`);
  }

  await recordTestCaseAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    action: "test_case.updated",
    targetId: parsed.data.testCaseId,
  });

  revalidatePath("/checks");
  redirect(`/checks?notice=${encodeURIComponent("Test case saved.")}`);
}

export async function archiveTestCaseAction(formData: FormData) {
  const parsed = testCaseIdFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/checks?error=${encodeURIComponent("Test case id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const archiveResult = await supabase
    .from("test_cases")
    .update(buildTestCaseArchiveUpdate())
    .eq("agency_id", workspace.agency.id)
    .eq("id", parsed.data.testCaseId)
    .select("id")
    .maybeSingle();

  try {
    assertMutationTouchedRow(archiveResult, "Test case was not found or is not accessible.");
  } catch (error) {
    redirect(`/checks?error=${encodeURIComponent(formatActionError(error, "Test case could not be archived."))}`);
  }

  await recordTestCaseAuditEvent({
    agencyId: workspace.agency.id,
    actorUserId: workspace.user.id,
    action: "test_case.archived",
    targetId: parsed.data.testCaseId,
  });

  revalidatePath("/checks");
  redirect(`/checks?notice=${encodeURIComponent("Test case archived. Historical synthetic runs were preserved.")}`);
}

async function executeTestPackRun({
  supabase,
  agencyId,
  testPackId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  testPackId: string;
}) {
  const pack = await loadTestPack({ supabase, agencyId, testPackId });
  const workflow = await loadWorkflow({ supabase, agencyId, workflowId: pack.workflow_id });
  const cases = await loadTestCases({ supabase, agencyId, testPackId: pack.id });

  if (!pack.enabled) {
    throw new Error("Test pack is disabled.");
  }

  if (!cases.length) {
    throw new Error("Add at least one test case before running this pack.");
  }

  const authConfig = workflow.encrypted_auth_config
    ? decryptJsonPayload<WorkflowAuthConfig>(workflow.encrypted_auth_config)
    : { type: "none" as const };

  for (const testCase of cases) {
    const runConfig = buildSyntheticRunConfig({
      inputJson: testCase.input_json,
      assertionsJson: testCase.assertions_json,
    });
    const result = await runHttpCheck({
      workflow: {
        endpointUrl: workflow.endpoint_url,
        method: workflow.method,
        authType: workflow.auth_type,
      },
      check: {
        configJson: runConfig,
      },
      authConfig,
    });
    const runInsert = buildTestRunInsert({
      agencyId,
      workflowId: workflow.id,
      testPackId: pack.id,
      testCaseId: testCase.id,
      result,
    });
    const { data: runRow, error: runError } = await supabase
      .from("test_runs")
      .insert(runInsert)
      .select("id, status")
      .single();

    if (runError || !runRow) {
      throw new Error(`Test run could not be saved: ${runError?.message ?? "Unknown database error."}`);
    }

    await syncSyntheticIssueForTestRun({
      supabase,
      context: {
        agencyId,
        clientId: workflow.client_id,
        workflowId: workflow.id,
        workflowName: workflow.name,
        testPackId: pack.id,
        testPackName: pack.name,
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        testRunId: runRow.id as string,
        status: runRow.status as TestRunStatus,
        errorMessage: runInsert.error_message ?? undefined,
      },
    });
  }
}

async function loadTestPack({
  supabase,
  agencyId,
  testPackId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  testPackId: string;
}) {
  const { data, error } = await supabase
    .from("test_packs")
    .select("id, agency_id, workflow_id, name, description, enabled")
    .eq("agency_id", agencyId)
    .eq("id", testPackId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Test pack could not be found.");
  }

  return data as TestPackRow;
}

async function loadWorkflow({
  supabase,
  agencyId,
  workflowId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  workflowId: string;
}) {
  const { data, error } = await supabase
    .from("workflows")
    .select("id, agency_id, client_id, name, endpoint_url, method, auth_type, encrypted_auth_config")
    .eq("agency_id", agencyId)
    .eq("id", workflowId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Workflow could not be found.");
  }

  return data as TestWorkflowRow;
}

async function loadTestCases({
  supabase,
  agencyId,
  testPackId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  testPackId: string;
}) {
  const { data, error } = await supabase
    .from("test_cases")
    .select("id, agency_id, workflow_id, test_pack_id, name, input_json, assertions_json")
    .eq("agency_id", agencyId)
    .eq("test_pack_id", testPackId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Test cases could not be loaded: ${error.message}`);
  }

  return (data ?? []) as TestCaseRow[];
}

async function recordTestPackAuditEvent({
  agencyId,
  actorUserId,
  action,
  targetId,
}: {
  agencyId: string;
  actorUserId: string;
  action: "test_pack.updated" | "test_pack.disabled";
  targetId: string;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId,
      actorUserId,
      action,
      targetType: "test_pack",
      targetId,
      metadata: {},
    });
  } catch {
    // Audit logging must not block test-pack lifecycle actions.
  }
}

async function recordTestCaseAuditEvent({
  agencyId,
  actorUserId,
  action,
  targetId,
}: {
  agencyId: string;
  actorUserId: string;
  action: "test_case.updated" | "test_case.archived";
  targetId: string;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId,
      actorUserId,
      action,
      targetType: "test_case",
      targetId,
      metadata: {},
    });
  } catch {
    // Audit logging must not block test-case lifecycle actions.
  }
}
