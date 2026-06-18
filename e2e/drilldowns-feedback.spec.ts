import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test("core drilldowns and action feedback stay connected across the MVP loop", async ({
  page,
  baseURL,
}) => {
  test.skip(!hasRequiredEnv(), "Drilldown acceptance E2E requires Supabase service credentials.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-drilldown-${runId}@example.invalid`;
  const password = `QaDrilldown-${runId}!`;
  const agencyName = `QA Drilldown Agency ${runId}`;
  const agencySlug = `qa-drilldown-${runId}`;
  const clientName = `Drilldown Client ${runId}`;
  const workflowName = `Drilldown Workflow ${runId}`;
  const endpointUrl = `${appUrl}/api/e2e-drilldown-missing-${runId}`;

  await createConfirmedUser({ email, password });
  await signInAndCreateWorkspace(page, {
    appUrl,
    email,
    password,
    agencyName,
    agencySlug,
  });

  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await createClient(page, clientName, `qa-drilldown-${runId}@example.invalid`);
  const client = await poll(async () => {
    const rows = await getRows<ClientRow>(
      "clients",
      `name=eq.${encodeURIComponent(clientName)}&select=id,name`,
    );
    return rows[0] ?? null;
  }, "created drilldown client");

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add workflow" }).click();
  await expect(page.getByRole("heading", { name: "Add workflow" })).toBeVisible();
  await page.getByRole("button", { name: "Manual setup" }).click();
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
  await expect(page.getByText("Workflow added. Run its first check when ready.")).toBeVisible();
  const workflowId = new URL(page.url()).pathname.split("/").pop() ?? "";
  expect(workflowId).toMatch(/[0-9a-f-]{36}/);

  await page
    .getByRole("navigation", { name: "Workflow detail sections" })
    .getByRole("link", { name: "Checks" })
    .click();
  await expect(page.getByRole("heading", { name: "Checks" })).toBeVisible();
  const runForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Run", exact: true }) });
  await Promise.all([
    page.waitForURL(
      (url) =>
        url.pathname === `/workflows/${workflowId}` &&
        (url.searchParams.get("notice") ?? "").includes("Check run completed"),
      { timeout: 30_000, waitUntil: "commit" },
    ),
    runForm.getByRole("button", { name: "Run", exact: true }).click(),
  ]);
  await expect(page.getByText("Check run completed and history was updated.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Workflow detail sections" })
    .getByRole("link", { name: "Overview" })
    .click();
  await expect(page.getByRole("heading", { name: "Run history" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "404", exact: true })).toBeVisible();

  const issue = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `workflow_id=eq.${workflowId}&select=id,title,status`,
    );
    return rows[0] ?? null;
  }, "created drilldown issue");

  await page.goto("/issues", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Issue queue" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(issue.title) }).click();
  await expect(page).toHaveURL(new RegExp(`/issues/${issue.id}`));
  await expect(page.getByRole("heading", { name: issue.title })).toBeVisible();
  await page.getByRole("button", { name: "Exclude from report" }).click();
  await expect(page.getByText("Issue excluded from reports.")).toBeVisible();
  await page.getByRole("button", { name: "Mark reportable" }).click();
  await expect(page.getByText("Issue marked reportable.")).toBeVisible();
  await page.getByRole("button", { name: "Rerun check" }).click();
  await expect(page.getByText("Check rerun completed.")).toBeVisible();
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByText("Issue assigned.")).toBeVisible();
  await page.getByLabel("Maintenance note").fill("Queued credential refresh before rerun-after-fix.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Issue note saved.")).toBeVisible();
  await expect(page.getByText("Queued credential refresh before rerun-after-fix.")).toBeVisible();
  await page.getByLabel("Resolution note").fill("Confirmed the failed endpoint path and documented the remediation.");
  await page.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByText("Issue resolved.")).toBeVisible();

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.getByRole("table").getByRole("link", { name: workflowName }).click();
  await expect(page).toHaveURL(new RegExp(`/workflows/${workflowId}`));
  await expect(page.getByRole("heading", { name: workflowName })).toBeVisible();

  await page.goto(`/clients/${client.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("table").getByRole("link", { name: workflowName }).click();
  await expect(page).toHaveURL(new RegExp(`/workflows/${workflowId}`));

  await page.goto("/reports", { waitUntil: "domcontentloaded" });
  const reportForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Generate" }) });
  await reportForm.getByLabel("Client").selectOption({ label: clientName });
  await reportForm.getByLabel("Period").fill("2026-06");
  await reportForm.getByRole("button", { name: "Generate" }).click();
  const report = await poll(async () => {
    const rows = await getRows<ReportRow>(
      "reports",
      `client_id=eq.${client.id}&period=eq.2026-06&select=id,period_label`,
    );
    return rows[0] ?? null;
  }, "generated drilldown report");
  await expect(page).toHaveURL(new RegExp(`/reports/${report.id}`));
  await expect(page.getByText("Report generated.")).toBeVisible();
  await expect(page.getByText(/1 reportable issues were resolved/)).toBeVisible();

  await page.goto(`/clients/${client.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: new RegExp(report.period_label) }).click();
  await expect(page).toHaveURL(new RegExp(`/reports/${report.id}`));
  await expect(page.getByRole("heading", { name: new RegExp(`${clientName} ${report.period_label}`) })).toBeVisible();
});

type ClientRow = {
  id: string;
  name: string;
};

type IssueRow = {
  id: string;
  title: string;
  status: string;
};

type ReportRow = {
  id: string;
  period_label: string;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Drilldown QA" },
    }),
  });
}

async function signInAndCreateWorkspace(
  page: import("@playwright/test").Page,
  input: {
    appUrl: string;
    email: string;
    password: string;
    agencyName: string;
    agencySlug: string;
  },
) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/" || url.pathname === "/onboarding", {
      timeout: 15_000,
    }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);

  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  if (page.url().includes("/onboarding")) {
    await page.getByLabel("Agency name").fill(input.agencyName);
    await page.getByLabel("Slug").fill(input.agencySlug);
    await Promise.all([
      page.waitForURL(`${input.appUrl}/`, { timeout: 15_000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }
}

async function createClient(page: import("@playwright/test").Page, name: string, email: string) {
  await page.getByRole("button", { name: "New client" }).click();
  const dialog = page.getByRole("dialog", { name: "New client" });
  await expect(dialog.getByRole("heading", { name: "New client" })).toBeVisible();
  await dialog.getByLabel("Client name").fill(name);
  await dialog.getByLabel("Industry").fill("QA Automation");
  await dialog.getByLabel("Report email").fill(email);
  await dialog.getByLabel("Notes").fill("Drilldown acceptance client.");
  await dialog.getByRole("button", { name: "Add client" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
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
