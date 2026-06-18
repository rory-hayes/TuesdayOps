import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
  SCHEDULER_SECRET: process.env.SCHEDULER_SECRET ?? localEnv.SCHEDULER_SECRET,
};

test("enabled health checks run through the protected scheduled runner", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!hasRequiredEnv(), "Scheduled-check E2E requires Supabase service and scheduler secrets.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-scheduled-${runId}@example.invalid`;
  const password = `QaScheduled-${runId}!`;
  const agencyName = `QA Scheduled Agency ${runId}`;
  const agencySlug = `qa-scheduled-${runId}`;
  const clientName = `Scheduled Client ${runId}`;
  const workflowName = `Scheduled Failing Workflow ${runId}`;
  const endpointUrl = `${appUrl}/api/e2e-missing-${runId}`;
  const consoleMessages: Array<{ type: string; text: string }> = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    consoleMessages.push({ type: "pageerror", text: error.message });
  });

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
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/onboarding")) {
    const agencyNameInput = page.getByLabel("Agency name");
    const agencySlugInput = page.getByLabel("Slug");
    await agencyNameInput.fill(agencyName);
    await agencySlugInput.fill(agencySlug);
    await expect(agencyNameInput).toHaveValue(agencyName);
    await expect(agencySlugInput).toHaveValue(agencySlug);
    await Promise.all([
      page.waitForURL(`${appUrl}/`, { timeout: 15_000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }

  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/clients");
  await page.getByRole("button", { name: "New client" }).click();
  const clientDialog = page.getByRole("dialog", { name: "New client" });
  await expect(clientDialog.getByRole("heading", { name: "New client" })).toBeVisible();
  await clientDialog.getByLabel("Client name").fill(clientName);
  await clientDialog.getByLabel("Industry").fill("QA Automation");
  await clientDialog.getByLabel("Report email").fill(`qa-${runId}@example.invalid`);
  await clientDialog.getByLabel("Notes").fill("Scheduled check E2E client.");
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

  const check = await poll(async () => {
    const rows = await getRows<CheckRow>(
      "checks",
      `workflow_id=eq.${workflowId}&select=id,workflow_id`,
    );
    return rows[0] ?? null;
  }, "created health check");

  const firstScheduler = await triggerScheduler(appUrl, { checkId: check.id });
  expect(firstScheduler.completed).toBeGreaterThanOrEqual(1);

  const firstRuns = await poll(async () => {
    const rows = await getRows<ScheduledRunRow>(
      "check_runs",
      `workflow_id=eq.${workflowId}&select=id,status,status_code,trigger,scheduled_for,created_at&order=created_at.desc`,
    );
    const scheduled = rows.filter((row) => row.trigger === "scheduled");
    return scheduled.length ? scheduled : null;
  }, "scheduled check run");
  const latestRun = firstRuns[0];

  expect(latestRun.status).toBe("failed");
  expect(latestRun.status_code).toBe(404);
  expect(latestRun.scheduled_for).toBeTruthy();

  const firstIssues = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `workflow_id=eq.${workflowId}&select=id,status,severity,occurrence_count,title,created_at&order=created_at.desc`,
    );
    return rows.length ? rows : null;
  }, "issue created from scheduled run");
  const latestIssue = firstIssues[0];

  expect(["open", "in_review"]).toContain(latestIssue.status);
  expect(latestIssue.occurrence_count).toBe(1);

  await triggerScheduler(appUrl, { checkId: check.id });

  const secondRuns = await getRows<ScheduledRunRow>(
    "check_runs",
    `workflow_id=eq.${workflowId}&trigger=eq.scheduled&select=id,status,status_code,trigger,scheduled_for,created_at&order=created_at.desc`,
  );
  expect(secondRuns).toHaveLength(firstRuns.length);

  await page.goto(`/workflows/${workflowId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("failed").first()).toBeVisible();
  await testInfo.attach("scheduled-workflow", {
    body: await page.screenshot({ caret: "initial", fullPage: false }),
    contentType: "image/png",
  });

  await page.goto(`/issues?workflowId=${workflowId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: latestIssue.title })).toBeVisible();
  await testInfo.attach("scheduled-issue", {
    body: await page.screenshot({ caret: "initial", fullPage: false }),
    contentType: "image/png",
  });

  const protectedResponse = await fetch(`${appUrl}/api/scheduler/run-due-checks`, { method: "POST" });
  expect(protectedResponse.status).toBe(401);
  expect(consoleMessages).toEqual([]);
});

type ScheduledRunRow = {
  id: string;
  status: string;
  status_code: number | null;
  trigger: string;
  scheduled_for: string | null;
  created_at: string;
};

type CheckRow = {
  id: string;
  workflow_id: string;
};

type IssueRow = {
  id: string;
  status: string;
  severity: string;
  occurrence_count: number;
  title: string;
  created_at: string;
};

type SchedulerResponse = {
  attempted: number;
  completed: number;
  skipped: number;
  failed: number;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Scheduled QA" },
    }),
  });
}

async function triggerScheduler(
  appUrl: string,
  input: { checkId?: string } = {},
): Promise<SchedulerResponse> {
  const response = await fetch(`${appUrl}/api/scheduler/run-due-checks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-scheduler-secret": env.SCHEDULER_SECRET ?? "",
    },
    body: JSON.stringify(input),
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Scheduler trigger failed: ${JSON.stringify(body)}`);
  }

  return body as SchedulerResponse;
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
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SECRET_KEY &&
      env.SCHEDULER_SECRET,
  );
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
