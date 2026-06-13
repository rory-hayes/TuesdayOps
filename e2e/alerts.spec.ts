import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
  SCHEDULER_SECRET: process.env.SCHEDULER_SECRET ?? localEnv.SCHEDULER_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? localEnv.RESEND_API_KEY,
};

test("high-severity scheduled issue records an alert attempt", async ({ page, baseURL }) => {
  test.skip(!hasRequiredEnv(), "Alert E2E requires Supabase service and scheduler secrets.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-alert-${runId}@example.invalid`;
  const password = `QaAlert-${runId}!`;
  const agencyName = `QA Alert Agency ${runId}`;
  const agencySlug = `qa-alert-${runId}`;
  const clientName = `Alert Client ${runId}`;
  const workflowName = `Alert Failing Workflow ${runId}`;

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
      page.waitForURL(`${appUrl}/`, { timeout: 15_000 }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }

  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Client name").fill(clientName);
  await page.getByLabel("Industry").fill("QA Automation");
  await page.getByLabel("Report email").fill(`qa-alert-${runId}@example.invalid`);
  await page.getByLabel("Notes").fill("Alert E2E client.");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText(clientName)).toBeVisible();

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.selectOption('select[name="clientId"]', { label: clientName });
  await page.getByLabel("Workflow name").fill(workflowName);
  await page.getByLabel("Endpoint URL").fill("http://127.0.0.1:9/unreachable");
  await page.getByLabel("Frequency minutes").fill("5");
  await page.getByLabel("Expected status").fill("200");
  await page.getByLabel("Max latency ms").fill("5000");
  const workflowForm = page.locator("form").filter({ has: page.locator('input[name="endpointUrl"]') });
  await Promise.all([
    page.waitForURL(/\/workflows\/[0-9a-f-]+$/, { timeout: 15_000 }),
    workflowForm.getByRole("button", { name: "Add workflow" }).click(),
  ]);

  const workflowId = page.url().split("/").pop();
  expect(workflowId).toBeTruthy();

  const scheduler = await triggerScheduler(appUrl);
  expect(scheduler.completed).toBeGreaterThanOrEqual(1);

  const issue = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `workflow_id=eq.${workflowId}&select=id,status,severity,alert_sent_at,alert_delivery_id,alert_error,alert_last_attempt_at,title&order=created_at.desc`,
    );
    return rows.find((row) => row.severity === "high" && row.alert_last_attempt_at) ?? null;
  }, "high-severity issue alert attempt");

  expect(issue.status).toBe("open");
  expect(issue.alert_last_attempt_at).toBeTruthy();

  if (env.RESEND_API_KEY) {
    expect(issue.alert_sent_at).toBeTruthy();
    expect(issue.alert_delivery_id).toBeTruthy();
    expect(issue.alert_error).toBeNull();
  } else {
    expect(issue.alert_sent_at).toBeNull();
    expect(issue.alert_delivery_id).toBeNull();
    expect(issue.alert_error).toContain("Missing RESEND_API_KEY");
  }
});

type SchedulerResponse = {
  attempted: number;
  completed: number;
  skipped: number;
  failed: number;
};

type IssueRow = {
  id: string;
  status: string;
  severity: string;
  alert_sent_at: string | null;
  alert_delivery_id: string | null;
  alert_error: string | null;
  alert_last_attempt_at: string | null;
  title: string;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Alert QA" },
    }),
  });
}

async function triggerScheduler(appUrl: string): Promise<SchedulerResponse> {
  const response = await fetch(`${appUrl}/api/scheduler/run-due-checks`, {
    method: "POST",
    headers: { "x-scheduler-secret": env.SCHEDULER_SECRET ?? "" },
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
