import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test.skip(!hasRequiredEnv(), "Production readiness E2E requires Supabase service credentials.");

test("production readiness checklist covers core happy and sad paths", async ({ page, baseURL }) => {
  const appUrl = baseURL ?? "https://maintainflow.io";
  const runId = Date.now();
  const email = `qa-production-${runId}@example.invalid`;
  const password = `QaProduction-${runId}!`;
  const agencyName = `QA Production Agency ${runId}`;
  const agencySlug = `qa-production-${runId}`;
  const clientName = `Production Client ${runId}`;
  const workflowName = `Production Failing Workflow ${runId}`;
  const endpointUrl = `${appUrl}/api/e2e-production-missing-${runId}`;
  const period = "2026-06";

  await expectProtectedRouteRedirects(page, ["/clients", "/workflows", "/checks", "/issues", "/reports", "/settings"]);
  await expectInvalidPasswordSignIn(page);
  await expectGoogleCallbackGuidance(page);

  const user = await createConfirmedUser({ email, password });

  await signInAndCreateWorkspace(page, {
    appUrl,
    email,
    password,
    agencyName,
    agencySlug,
  });

  await expect(page.getByText("Activation path")).toBeVisible();
  await expect(page.getByRole("button", { name: "Seed demo data" })).not.toBeVisible();
  await expect(page.getByText("Demo data")).not.toBeVisible();

  await createClient(page, clientName, `qa-production-${runId}@example.invalid`);
  const client = await poll(async () => {
    const rows = await getRows<ClientRow>(
      "clients",
      `name=eq.${encodeURIComponent(clientName)}&select=id,name`,
    );
    return rows[0] ?? null;
  }, "created production readiness client");

  await expectPrivateEndpointBlocked(page, clientName);
  const workflowId = await createFailingWorkflow(page, {
    clientName,
    endpointUrl,
    workflowName,
  });

  await runManualCheckAndVerifyHistory(page, workflowId);

  const issue = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `workflow_id=eq.${workflowId}&select=id,title,status,reportable,created_at&order=created_at.desc`,
    );
    return rows[0] ?? null;
  }, "issue from failed production readiness check");
  expect(issue.status).toBe("open");
  expect(issue.reportable).toBe(true);

  await resolveIssue(page, issue);
  const resolvedIssue = await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `id=eq.${issue.id}&select=id,title,status,reportable,resolved_at`,
    );
    return rows[0]?.status === "resolved" ? rows[0] : null;
  }, "resolved production readiness issue");
  expect(resolvedIssue.resolved_at).toBeTruthy();

  const report = await generateReport(page, {
    clientName,
    clientId: client.id,
    period,
  });
  await exportAndDownloadReport(page, appUrl, report.id);

  await verifyBillingStateAndCheckoutEntry(page);

  const membership = await poll(async () => {
    const rows = await getRows<MembershipRow>(
      "memberships",
      `user_id=eq.${user.id}&select=agency_id`,
    );
    return rows[0] ?? null;
  }, "production readiness membership");
  const demoClients = await getRows<ClientRow>(
    "clients",
    `agency_id=eq.${membership.agency_id}&slug=eq.acme-ai-support-demo&select=id,name`,
  );
  expect(demoClients).toHaveLength(0);
});

async function expectProtectedRouteRedirects(page: import("@playwright/test").Page, paths: string[]) {
  for (const path of paths) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sign-in/);
  }
}

async function expectInvalidPasswordSignIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill("missing-production-user@example.invalid");
  await page.getByLabel("Password").fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/could not find an active account/i)).toBeVisible();
}

async function expectGoogleCallbackGuidance(page: import("@playwright/test").Page) {
  await page.goto(
    "/auth/callback?source=sign-in&error_description=user%20not%20found",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).toHaveURL(/\/sign-in\?error=/);
  await expect(page.getByText("No account is linked to that Google profile yet.")).toBeVisible();
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
  await page.waitForLoadState("networkidle");
  if (page.url().includes("/onboarding")) {
    const agencyNameField = page.getByLabel("Agency name");
    const slugField = page.getByLabel("Slug");
    await agencyNameField.fill(input.agencyName);
    await expect(agencyNameField).toHaveValue(input.agencyName);
    await slugField.fill(input.agencySlug);
    await expect(slugField).toHaveValue(input.agencySlug);
    await Promise.all([
      page.waitForURL(`${input.appUrl}/`, { timeout: 30_000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }
}

async function createClient(page: import("@playwright/test").Page, clientName: string, reportEmail: string) {
  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "New client" }).click();
  const dialog = page.getByRole("dialog", { name: "New client" });
  await expect(dialog.getByRole("heading", { name: "New client" })).toBeVisible();
  await dialog.getByLabel("Client name").fill(clientName);
  await dialog.getByLabel("Industry").fill("QA Automation");
  await dialog.getByLabel("Report email").fill(reportEmail);
  await dialog.getByLabel("Notes").fill("Production readiness E2E client.");
  await dialog.getByRole("button", { name: "Add client" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole("table").getByRole("link", { name: clientName })).toBeVisible({
    timeout: 30_000,
  });
}

async function expectPrivateEndpointBlocked(page: import("@playwright/test").Page, clientName: string) {
  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add workflow" }).click();
  await page.getByRole("button", { name: "Manual setup" }).click();
  await page.selectOption('select[name="clientId"]', { label: clientName });
  await page.getByLabel("Workflow name").fill("Blocked private endpoint");
  await page.getByLabel("Endpoint URL").fill("http://127.0.0.1:9/private");
  await page.getByLabel("Frequency minutes").fill("5");
  const form = page.locator("form").filter({ has: page.locator('input[name="endpointUrl"]') });
  await form.getByRole("button", { name: "Create workflow" }).click();
  await expect(page.getByText("Private or local workflow endpoints are blocked in production.")).toBeVisible();
}

async function createFailingWorkflow(
  page: import("@playwright/test").Page,
  input: {
    clientName: string;
    endpointUrl: string;
    workflowName: string;
  },
): Promise<string> {
  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add workflow" }).click();
  await page.getByRole("button", { name: "Manual setup" }).click();
  await page.selectOption('select[name="clientId"]', { label: input.clientName });
  await page.getByLabel("Workflow name").fill(input.workflowName);
  await page.getByLabel("Endpoint URL").fill(input.endpointUrl);
  await page.getByLabel("Frequency minutes").fill("5");
  await page.getByLabel("Expected status").fill("200");
  await page.getByLabel("Max latency ms").fill("5000");
  const form = page.locator("form").filter({ has: page.locator('input[name="endpointUrl"]') });
  await Promise.all([
    page.waitForURL(/\/workflows\/[0-9a-f-]+(?:\?.*)?$/, { timeout: 30_000, waitUntil: "commit" }),
    form.getByRole("button", { name: "Create workflow" }).click(),
  ]);
  await expect(page.getByText("Workflow added. Run its first check when ready.")).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

async function runManualCheckAndVerifyHistory(page: import("@playwright/test").Page, workflowId: string) {
  await page
    .getByRole("navigation", { name: "Workflow detail sections" })
    .getByRole("link", { name: "Checks" })
    .click();
  const runForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Run", exact: true }) });
  await runForm.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Check run failed. Issue tracking and history were updated.")).toBeVisible({
    timeout: 30_000,
  });
  await page
    .getByRole("navigation", { name: "Workflow detail sections" })
    .getByRole("link", { name: "Overview" })
    .click();
  await expect(page.getByRole("heading", { name: "Run history" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "404", exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/workflows/${workflowId}`));
}

async function resolveIssue(page: import("@playwright/test").Page, issue: IssueRow) {
  await page.goto(`/issues/${issue.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: issue.title })).toBeVisible();
  await page.getByLabel("Resolution note").fill("Production readiness confirmed the failed endpoint path and documented remediation.");
  await page.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByText("Issue resolved.")).toBeVisible();
}

async function generateReport(
  page: import("@playwright/test").Page,
  input: {
    clientName: string;
    clientId: string;
    period: string;
  },
): Promise<ReportRow> {
  await page.goto("/reports", { waitUntil: "domcontentloaded" });
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Generate" }) });
  await form.getByLabel("Client").selectOption({ label: input.clientName });
  await form.getByLabel("Period").fill(input.period);
  await form.getByRole("button", { name: "Generate" }).click();
  const report = await poll(async () => {
    const rows = await getRows<ReportRow>(
      "reports",
      `client_id=eq.${input.clientId}&period=eq.${input.period}&select=id,status,summary,pdf_url`,
    );
    return rows[0] ?? null;
  }, "production readiness report");
  await expect(page).toHaveURL(new RegExp(`/reports/${report.id}`));
  await expect(page.getByText("Report generated.")).toBeVisible();
  await expect(page.getByText("Workflow maintenance proof")).toBeVisible();
  return report;
}

async function exportAndDownloadReport(page: import("@playwright/test").Page, appUrl: string, reportId: string) {
  const pdfForm = page.locator("form").filter({ has: page.getByRole("button", { name: "PDF" }) });
  await pdfForm.getByRole("button", { name: "PDF" }).click();
  await expect(page.getByText("PDF is ready to download.")).toBeVisible({ timeout: 30_000 });
  const response = await page.request.get(`${appUrl}/api/reports/${reportId}/download`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect((await response.body()).toString("latin1").startsWith("%PDF-1.4")).toBe(true);
}

async function verifyBillingStateAndCheckoutEntry(page: import("@playwright/test").Page) {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
  await expect(page.getByText("Billing status")).toBeVisible();
  await expect(page.getByText("0 / 3")).not.toBeVisible();
  await page.getByRole("button", { name: "Choose" }).first().click();
  const result = await waitForCheckoutOrBillingError(page);
  expect(["checkout", "config-error"]).toContain(result);
}

async function waitForCheckoutOrBillingError(
  page: import("@playwright/test").Page,
): Promise<"checkout" | "config-error"> {
  const billingError = page.getByText(/Billing is not ready yet|Billing could not be updated|Checkout could not be opened/);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const url = new URL(page.url());

    if (url.hostname === "checkout.stripe.com") {
      return "checkout";
    }

    if (await billingError.isVisible().catch(() => false)) {
      return "config-error";
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for Stripe Checkout or billing setup error. Current URL: ${page.url()}`);
}

type UserRow = {
  id: string;
};

type MembershipRow = {
  agency_id: string;
};

type ClientRow = {
  id: string;
  name: string;
};

type IssueRow = {
  id: string;
  title: string;
  status: string;
  reportable: boolean;
  resolved_at?: string | null;
};

type ReportRow = {
  id: string;
  status: string;
  summary: string;
  pdf_url: string | null;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }): Promise<UserRow> {
  return supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Production Readiness QA" },
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
