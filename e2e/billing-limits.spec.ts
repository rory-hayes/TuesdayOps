import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test("billing settings show limits and starter client limit is enforced", async ({ page, baseURL }) => {
  test.skip(!hasRequiredEnv(), "Billing E2E requires Supabase service credentials.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-billing-${runId}@example.invalid`;
  const password = `QaBilling-${runId}!`;
  const agencyName = `QA Billing Agency ${runId}`;
  const agencySlug = `qa-billing-${runId}`;
  const overflowClient = `Billing Overflow ${runId}`;
  const firstWorkflow = `Billing Workflow ${runId}-1`;

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
    const agencyNameField = page.getByLabel("Agency name");
    const slugField = page.getByLabel("Slug");
    await agencyNameField.fill(agencyName);
    await expect(agencyNameField).toHaveValue(agencyName);
    await slugField.fill(agencySlug);
    await expect(slugField).toHaveValue(agencySlug);
    await Promise.all([
      page.waitForURL(`${appUrl}/`, { timeout: 15_000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
  }

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Production readiness" })).not.toBeVisible();
  await expect(page.getByText("Launch gate")).not.toBeVisible();
  await expect(page.getByText("Primary color")).not.toBeVisible();
  await expect(page.getByText("Logo and color fields will sync to PDFs.")).not.toBeVisible();
  await expect(page.getByText("0 / 3")).toBeVisible();
  await expect(page.getByText("0 / 10")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage billing" })).toBeDisabled();
  await page.getByRole("button", { name: "Choose" }).nth(1).click();
  const upgradeResult = await waitForCheckoutOrBillingError(page);
  expect(["checkout", "config-error"]).toContain(upgradeResult);

  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  for (let index = 1; index <= 3; index += 1) {
    const clientName = `Billing Client ${runId}-${index}`;
    await createClient(page, clientName, `qa-billing-${runId}-${index}@example.invalid`);
    await expect(page.getByRole("table").getByRole("link", { name: clientName })).toBeVisible();
  }

  await createClient(page, overflowClient, `qa-billing-overflow-${runId}@example.invalid`);
  await expect(page.getByText("Upgrade to add more clients.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Click here to upgrade" })).toBeVisible();
  await expect(page.getByText(overflowClient)).not.toBeVisible();

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await createWorkflow(page, {
    appUrl,
    runId,
    workflowName: firstWorkflow,
    index: 1,
  });
  await expect(page.getByText(firstWorkflow)).toBeVisible();
});

async function createClient(page: import("@playwright/test").Page, name: string, email: string) {
  await page.getByRole("button", { name: "New client" }).click();
  const dialog = page.getByRole("dialog", { name: "New client" });
  await expect(dialog.getByRole("heading", { name: "New client" })).toBeVisible();
  await dialog.getByLabel("Client name").fill(name);
  await dialog.getByLabel("Industry").fill("QA Automation");
  await dialog.getByLabel("Report email").fill(email);
  await dialog.getByLabel("Notes").fill("Billing limit E2E client.");
  await dialog.getByRole("button", { name: "Add client" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}

async function createWorkflow(
  page: import("@playwright/test").Page,
  input: {
    appUrl: string;
    runId: number;
    workflowName: string;
    index: number;
    expectRedirect?: boolean;
  },
) {
  await page.getByRole("button", { name: "Add workflow" }).click();
  await expect(page.getByRole("heading", { name: "Add workflow" })).toBeVisible();
  await page.getByRole("button", { name: "Manual setup" }).click();
  await expect(page.getByRole("heading", { name: "Manual endpoint setup" })).toBeVisible();
  await page.getByLabel("Workflow name").fill(input.workflowName);
  await page.getByLabel("Endpoint URL").fill(
    `${input.appUrl}/api/e2e-billing-workflow-${input.runId}-${input.index}`,
  );
  await page.getByLabel("Frequency minutes").fill("5");
  await page.getByLabel("Expected status").fill("200");
  await page.getByLabel("Max latency ms").fill("5000");

  const workflowForm = page.locator("form").filter({ has: page.locator('input[name="endpointUrl"]') });

  if (input.expectRedirect === false) {
    await Promise.all([
      page.waitForURL(/\/workflows\?error=/, { timeout: 30_000, waitUntil: "commit" }),
      workflowForm.getByRole("button", { name: "Create workflow" }).click(),
    ]);
    return;
  }

  await Promise.all([
    page.waitForURL(/\/workflows\/[0-9a-f-]+(?:\?.*)?$/, { timeout: 30_000, waitUntil: "commit" }),
    workflowForm.getByRole("button", { name: "Create workflow" }).click(),
  ]);
}

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Billing QA" },
    }),
  });
}

async function waitForCheckoutOrBillingError(
  page: import("@playwright/test").Page,
): Promise<"checkout" | "config-error"> {
  const billingError = page.getByText(/Missing STRIPE_(SECRET_KEY|PRICE_ID(?:_[A-Z_]+)?)|Billing is not configured/);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const url = new URL(page.url());

    if (url.hostname === "checkout.stripe.com") {
      return "checkout";
    }

    if (await billingError.isVisible().catch(() => false)) {
      return "config-error";
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for Stripe Checkout or billing config error. Current URL: ${page.url()}`);
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
