"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { runHttpCheck, type WorkflowAuthConfig } from "@/lib/checks/runner";
import { decryptJsonPayload, type EncryptedJsonPayload } from "@/lib/security/secrets";
import { createClient } from "@/lib/supabase/server";
import {
  buildSyntheticIssueDraft,
  buildSyntheticIssueUpdateForRepeatFailure,
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

type ActiveSyntheticIssueRow = {
  id: string;
  occurrence_count: number | null;
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
    redirect(`/checks?error=${encodeURIComponent(error.message)}`);
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
  const pack = await loadTestPack({
    supabase,
    agencyId: workspace.agency.id,
    testPackId: parsed.data.testPackId,
  });
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
    redirect(`/checks?error=${encodeURIComponent(error.message)}`);
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
    const message = error instanceof Error ? error.message : "Test pack run failed.";
    redirect(`/checks?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/checks");
  revalidatePath("/issues");
  revalidatePath("/workflows");
  revalidatePath("/");
  redirect(`/checks?notice=${encodeURIComponent("Test pack run completed.")}`);
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

    await createOrUpdateIssueForSyntheticRun({
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
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Test cases could not be loaded: ${error.message}`);
  }

  return (data ?? []) as TestCaseRow[];
}

async function createOrUpdateIssueForSyntheticRun({
  supabase,
  context,
}: {
  supabase: SupabaseClient;
  context: {
    agencyId: string;
    clientId: string;
    workflowId: string;
    workflowName: string;
    testPackId: string;
    testPackName: string;
    testCaseId: string;
    testCaseName: string;
    testRunId: string;
    status: TestRunStatus;
    errorMessage?: string;
  };
}) {
  const draft = buildSyntheticIssueDraft(context);

  if (!draft) {
    return null;
  }

  const existing = await findActiveSyntheticIssue({
    supabase,
    agencyId: context.agencyId,
    workflowId: context.workflowId,
    fingerprint: draft.fingerprint,
  });

  if (existing) {
    const { data, error } = await supabase
      .from("issues")
      .update(
        buildSyntheticIssueUpdateForRepeatFailure({
          testRunId: context.testRunId,
          draft,
          existing: { occurrenceCount: existing.occurrence_count },
          now: new Date().toISOString(),
        }),
      )
      .eq("agency_id", context.agencyId)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Unable to update synthetic issue: ${error.message}`);
    }

    return { id: data.id as string, created: false };
  }

  const inserted = await insertSyntheticIssue({ supabase, context, draft });

  if (inserted.errorCode === "23505") {
    const retryExisting = await findActiveSyntheticIssue({
      supabase,
      agencyId: context.agencyId,
      workflowId: context.workflowId,
      fingerprint: draft.fingerprint,
    });

    if (retryExisting) {
      const { data, error } = await supabase
        .from("issues")
        .update(
          buildSyntheticIssueUpdateForRepeatFailure({
            testRunId: context.testRunId,
            draft,
            existing: { occurrenceCount: retryExisting.occurrence_count },
            now: new Date().toISOString(),
          }),
        )
        .eq("agency_id", context.agencyId)
        .eq("id", retryExisting.id)
        .select("id")
        .single();

      if (error) {
        throw new Error(`Unable to update synthetic issue: ${error.message}`);
      }

      return { id: data.id as string, created: false };
    }
  }

  if (inserted.errorMessage) {
    throw new Error(`Unable to create synthetic issue: ${inserted.errorMessage}`);
  }

  return { id: inserted.id, created: true };
}

async function findActiveSyntheticIssue({
  supabase,
  agencyId,
  workflowId,
  fingerprint,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  workflowId: string;
  fingerprint: string;
}) {
  const { data, error } = await supabase
    .from("issues")
    .select("id, occurrence_count")
    .eq("agency_id", agencyId)
    .eq("workflow_id", workflowId)
    .eq("fingerprint", fingerprint)
    .in("status", ["open", "in_review"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check active synthetic issues: ${error.message}`);
  }

  return data as ActiveSyntheticIssueRow | null;
}

async function insertSyntheticIssue({
  supabase,
  context,
  draft,
}: {
  supabase: SupabaseClient;
  context: {
    agencyId: string;
    clientId: string;
    workflowId: string;
    testRunId: string;
  };
  draft: NonNullable<ReturnType<typeof buildSyntheticIssueDraft>>;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("issues")
    .insert({
      agency_id: context.agencyId,
      client_id: context.clientId,
      workflow_id: context.workflowId,
      test_run_id: context.testRunId,
      fingerprint: draft.fingerprint,
      severity: draft.severity,
      status: "open",
      title: draft.title,
      description: draft.description,
      suggested_action: draft.suggestedAction,
      reportable: draft.reportable,
      last_seen_at: now,
      occurrence_count: 1,
    })
    .select("id")
    .single();

  return {
    id: data?.id as string | undefined,
    errorCode: error?.code,
    errorMessage: error?.message,
  };
}
