import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test("workflow can be imported from a cURL command", async ({ page, baseURL }) => {
  test.skip(!hasRequiredEnv(), "Workflow onboarding E2E requires Supabase service credentials.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-workflow-import-${runId}@example.invalid`;
  const password = `QaWorkflowImport-${runId}!`;
  const agencyName = `QA Workflow Import Agency ${runId}`;
  const agencySlug = `qa-workflow-import-${runId}`;
  const clientName = `Workflow Import Client ${runId}`;
  const workflowName = `Imported Lead Webhook ${runId}`;

  const user = await createConfirmedUser({ email, password });

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
      page.waitForURL(`${appUrl}/`, { timeout: 15_000 }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }

  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Client name").fill(clientName);
  await page.getByLabel("Industry").fill("QA Automation");
  await page.getByLabel("Report email").fill(`workflow-import-${runId}@example.invalid`);
  await page.getByLabel("Notes").fill("Workflow import E2E client.");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText(clientName)).toBeVisible();

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Quick workflow import" })).toBeVisible();
  await page.getByLabel("Import source").selectOption("curl");
  await page.getByLabel("Imported name").fill(workflowName);
  await page.getByLabel("Import details").fill(
    `curl -X POST "${appUrl}/api/e2e-import-${runId}" -H "Authorization: Bearer import_token_${runId}" -H "Content-Type: application/json" -d '{"ping":true}'`,
  );

  const importForm = page.locator("form").filter({ has: page.locator('textarea[name="importText"]') });
  await Promise.all([
    page.waitForURL(/\/workflows\/[0-9a-f-]+$/, { timeout: 15_000 }),
    importForm.getByRole("button", { name: "Import workflow" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: workflowName })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^POST$/ }).first()).toBeVisible();
  await expect(page.getByText(`${appUrl}/api/e2e-import-${runId}`)).toBeVisible();

  const membership = await poll(async () => {
    const rows = await getRows<MembershipRow>(
      "memberships",
      `user_id=eq.${user.id}&select=agency_id`,
    );
    return rows[0] ?? null;
  }, "agency membership");
  const workflows = await getRows<WorkflowRow>(
    "workflows",
    `agency_id=eq.${membership.agency_id}&name=eq.${encodeURIComponent(workflowName)}&select=id,method,auth_type`,
  );

  expect(workflows).toEqual([
    expect.objectContaining({ method: "POST", auth_type: "bearer" }),
  ]);

  const checks = await getRows<CheckRow>(
    "checks",
    `agency_id=eq.${membership.agency_id}&workflow_id=eq.${workflows[0].id}&select=config_json`,
  );

  expect(checks[0].config_json).toEqual(
    expect.objectContaining({
      requestBody: '{"ping":true}',
    }),
  );
});

type UserRow = {
  id: string;
};

type MembershipRow = {
  agency_id: string;
};

type WorkflowRow = {
  id: string;
  method: string;
  auth_type: string;
};

type CheckRow = {
  config_json: unknown;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  return supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Workflow Import QA" },
    }),
  }) as Promise<UserRow>;
}

async function getRows<T>(table: string, query: string): Promise<T[]> {
  return supabaseFetch(`/rest/v1/${table}?${query}`, {
    headers: { accept: "application/json" },
  }) as Promise<T[]>;
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
