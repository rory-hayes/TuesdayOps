import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test("synthetic test pack run stores failures and resolves recovered issues", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!hasRequiredEnv(), "Test-pack E2E requires Supabase service credentials.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-test-pack-${runId}@example.invalid`;
  const password = `QaTestPack-${runId}!`;
  const agencyName = `QA Test Pack Agency ${runId}`;
  const agencySlug = `qa-test-pack-${runId}`;
  const clientName = `Test Pack Client ${runId}`;
  const workflowName = `Synthetic Failing Workflow ${runId}`;
  const packName = `Regression Pack ${runId}`;
  const caseName = `Missing Result Case ${runId}`;
  const endpointUrl = `${appUrl}/api/e2e-test-pack-missing-${runId}`;

  await createConfirmedUser({ email, password });

  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/" || url.pathname === "/onboarding", {
      timeout: 15_000,
    }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);

  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  if (page.url().includes("/onboarding")) {
    await page.getByLabel("Agency name").fill(agencyName);
    await page.getByLabel("Slug").fill(agencySlug);
    await Promise.all([
      page.waitForURL(`${appUrl}/`, { timeout: 15_000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }

  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "New client" }).click();
  const clientDialog = page.getByRole("dialog", { name: "New client" });
  await expect(clientDialog.getByRole("heading", { name: "New client" })).toBeVisible();
  await clientDialog.getByLabel("Client name").fill(clientName);
  await clientDialog.getByLabel("Industry").fill("QA Automation");
  await clientDialog.getByLabel("Report email").fill(`qa-pack-${runId}@example.invalid`);
  await clientDialog.getByLabel("Notes").fill("Synthetic test pack E2E client.");
  await clientDialog.getByRole("button", { name: "Add client" }).click();
  await expect(clientDialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole("table").getByRole("link", { name: clientName })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add workflow" }).click();
  await expect(page.getByRole("heading", { name: "Add workflow" })).toBeVisible();
  await page.getByRole("button", { name: "Manual setup" }).click();
  await expect(page.getByRole("heading", { name: "Manual endpoint setup" })).toBeVisible();
  await page.selectOption('select[name="clientId"]', { label: clientName });
  await page.getByLabel("Workflow name").fill(workflowName);
  await page.getByLabel("Endpoint URL").fill(endpointUrl);
  await page.selectOption('select[name="method"]', "POST");
  await page.getByLabel("Frequency minutes").fill("5");
  await page.getByLabel("Expected status").fill("200");
  await page.getByLabel("Max latency ms").fill("5000");
  const workflowForm = page.locator("form").filter({ has: page.locator('input[name="endpointUrl"]') });
  await Promise.all([
    page.waitForURL(/\/workflows\/[0-9a-f-]+(?:\?.*)?$/, { timeout: 30_000, waitUntil: "commit" }),
    workflowForm.getByRole("button", { name: "Create workflow" }).click(),
  ]);
  const workflowId = new URL(page.url()).pathname.split("/").pop();
  expect(workflowId).toBeTruthy();

  await page.goto("/checks", { waitUntil: "domcontentloaded" });
  const packForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Add test pack" }) });
  await packForm.getByLabel("Workflow").selectOption({ label: workflowName });
  await packForm.getByLabel("Pack name").fill(packName);
  await packForm.getByLabel("Description").fill("Synthetic regression coverage for the QA handoff.");
  await packForm.getByRole("button", { name: "Add test pack" }).click();
  await expect(page.getByText("Test pack added.")).toBeVisible();
  await expect(page.getByText(packName)).toBeVisible();

  const pack = await poll(async () => {
    const rows = await getRows<TestPackRow>(
      "test_packs",
      `name=eq.${encodeURIComponent(packName)}&select=id,workflow_id,name`,
    );
    return rows[0] ?? null;
  }, "created test pack");
  expect(pack.workflow_id).toBe(workflowId);

  const caseForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Add case" }) });
  await caseForm.getByLabel("Case name").fill(caseName);
  await caseForm.getByLabel("Input JSON").fill('{"leadId":"qa-001","intent":"book"}');
  await caseForm.getByLabel("Expected status").fill("200");
  await caseForm.getByLabel("Max latency ms").fill("5000");
  await caseForm.getByLabel("Required field").fill("result.id");
  await caseForm.getByLabel("Must not contain").fill("fatal");
  await caseForm.getByRole("button", { name: "Add case" }).click();
  await expect(page.getByText("Test case added.")).toBeVisible();
  await expect(page.getByText(caseName)).toBeVisible();

  const testCase = await poll(async () => {
    const rows = await getRows<TestCaseRow>(
      "test_cases",
      `test_pack_id=eq.${pack.id}&name=eq.${encodeURIComponent(caseName)}&select=id,test_pack_id,name,assertions_json`,
    );
    return rows[0] ?? null;
  }, "created test case");
  expect(testCase.test_pack_id).toBe(pack.id);
  expect(testCase.assertions_json).toEqual([
    { type: "status_code", expected: 200 },
    { type: "latency_under", maxMs: 5000 },
    { type: "field_exists", path: "result.id" },
    { type: "not_contains", value: "fatal" },
  ]);

  const runPackForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Run pack" }) });
  await runPackForm.getByRole("button", { name: "Run pack" }).click();
  await expect(page.getByRole("button", { name: "Running..." })).toBeVisible();
  await expect(page.getByText("Test pack run completed.")).toBeVisible();

  const testRun = await poll(async () => {
    const rows = await getRows<TestRunRow>(
      "test_runs",
      `test_pack_id=eq.${pack.id}&select=id,status,status_code,error_message,created_at&order=created_at.desc`,
    );
    return rows[0] ?? null;
  }, "failed synthetic test run");
  expect(testRun.status).toBe("failed");
  expect(testRun.status_code).toBe(404);
  expect(testRun.error_message).toContain("Expected status 200");

  const issue = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `test_run_id=eq.${testRun.id}&select=id,status,severity,title,test_run_id,occurrence_count`,
    );
    return rows[0] ?? null;
  }, "synthetic issue");
  expect(issue.status).toBe("open");
  expect(issue.severity).toBe("medium");
  expect(issue.test_run_id).toBe(testRun.id);
  expect(issue.occurrence_count).toBe(1);
  expect(issue.title).toContain(workflowName);

  await updateRows(
    "test_cases",
    `id=eq.${testCase.id}`,
    {
      assertions_json: [
        { type: "status_code", expected: 404 },
        { type: "latency_under", maxMs: 5000 },
      ],
    },
  );

  await page.goto("/checks", { waitUntil: "domcontentloaded" });
  await page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Run pack" }) })
    .getByRole("button", { name: "Run pack" })
    .click();
  await expect(page.getByText("Test pack run completed.")).toBeVisible();

  const recoveredRun = await poll(async () => {
    const rows = await getRows<TestRunRow>(
      "test_runs",
      `test_pack_id=eq.${pack.id}&select=id,status,status_code,error_message,created_at&order=created_at.desc`,
    );
    const latest = rows[0] ?? null;
    return latest && latest.id !== testRun.id ? latest : null;
  }, "passing synthetic test run");
  expect(recoveredRun.status).toBe("passed");
  expect(recoveredRun.status_code).toBe(404);
  expect(recoveredRun.error_message).toBeNull();

  const resolvedIssue = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `id=eq.${issue.id}&select=id,status,severity,title,test_run_id,occurrence_count,resolution_note,resolved_at`,
    );
    return rows[0]?.status === "resolved" ? rows[0] : null;
  }, "resolved synthetic issue");
  expect(resolvedIssue.test_run_id).toBe(recoveredRun.id);
  expect(resolvedIssue.resolution_note).toBe("Synthetic test passed on rerun.");
  expect(resolvedIssue.resolved_at).toBeTruthy();

  await page.goto("/checks", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(caseName).first()).toBeVisible();
  await expect(page.getByText("passed").first()).toBeVisible();
  await testInfo.attach("test-pack-checks", {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png",
  });

  await page.goto("/issues", { waitUntil: "domcontentloaded" });
  const resolvedIssueCard = page.locator("article").filter({
    has: page.getByRole("link", { name: issue.title }),
  });
  await expect(resolvedIssueCard.getByText("resolved")).toBeVisible();

  await page.goto("/issues?status=open", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: issue.title })).not.toBeVisible();
});

type TestPackRow = {
  id: string;
  workflow_id: string;
  name: string;
};

type TestCaseRow = {
  id: string;
  test_pack_id: string;
  name: string;
  assertions_json: unknown;
};

type TestRunRow = {
  id: string;
  status: string;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
};

type IssueRow = {
  id: string;
  status: string;
  severity: string;
  title: string;
  test_run_id: string;
  occurrence_count: number;
  resolution_note?: string | null;
  resolved_at?: string | null;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Test Pack QA" },
    }),
  });
}

async function getRows<T>(table: string, query: string): Promise<T[]> {
  return supabaseFetch(`/rest/v1/${table}?${query}`, {
    headers: { accept: "application/json" },
  }) as Promise<T[]>;
}

async function updateRows(table: string, query: string, payload: Record<string, unknown>) {
  await supabaseFetch(`/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
}

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY ?? "",
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Supabase request failed ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function poll<T>(
  fn: () => Promise<T | null>,
  label: string,
  attempts = 20,
  delayMs = 500,
): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await fn();

    if (result) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timed out waiting for ${label}`);
}

function hasRequiredEnv() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

function loadLocalEnv(): Record<string, string> {
  if (!fs.existsSync(".env.local")) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}
