import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test("onboarding checklist can seed a useful demo workspace", async ({ page, baseURL }) => {
  test.skip(!hasRequiredEnv(), "Onboarding demo E2E requires Supabase service credentials.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-onboarding-${runId}@example.invalid`;
  const password = `QaOnboarding-${runId}!`;
  const agencyName = `QA Onboarding Agency ${runId}`;
  const agencySlug = `qa-onboarding-${runId}`;
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

  await expect(page.getByText("Activation path")).toBeVisible();
  await expect(page.getByText("1 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Seed demo data" })).toBeVisible();

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/" && url.searchParams.get("sample") === "seeded", {
      timeout: 15_000,
    }),
    page.getByRole("button", { name: "Seed demo data" }).click(),
  ]);

  await expect(page.getByText("Demo data is ready.")).toBeVisible();
  await expect(page.getByText("5 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo seeded" })).toBeDisabled();
  await expect(page.getByRole("cell", { name: "Lead Intake Assistant" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Acme AI Support" })).toBeVisible();

  const membership = await poll(async () => {
    const rows = await getRows<MembershipRow>(
      "memberships",
      `user_id=eq.${user.id}&select=agency_id`,
    );
    return rows[0] ?? null;
  }, "agency membership");

  const clients = await getRows<ClientRow>(
    "clients",
    `agency_id=eq.${membership.agency_id}&slug=eq.acme-ai-support-demo&select=id,name`,
  );
  expect(clients).toHaveLength(1);

  const workflows = await getRows<WorkflowRow>(
    "workflows",
    `agency_id=eq.${membership.agency_id}&client_id=eq.${clients[0].id}&select=id,name,auth_type`,
  );
  expect(workflows).toEqual([
    expect.objectContaining({ name: "Lead Intake Assistant", auth_type: "none" }),
  ]);

  const issues = await getRows<IssueRow>(
    "issues",
    `agency_id=eq.${membership.agency_id}&workflow_id=eq.${workflows[0].id}&select=id,title,status,reportable`,
  );
  expect(issues).toEqual([
    expect.objectContaining({
      title: "Lead intake assistant returned 500 errors",
      status: "open",
      reportable: true,
    }),
  ]);

  const reports = await getRows<ReportRow>(
    "reports",
    `agency_id=eq.${membership.agency_id}&client_id=eq.${clients[0].id}&select=id,status,summary`,
  );
  expect(reports).toEqual([
    expect.objectContaining({
      status: "ready_to_send",
    }),
  ]);

  await page.goto("/reports", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Acme AI Support June/ })).toBeVisible();
  await page.goto("/issues", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Lead intake assistant returned 500 errors" })).toBeVisible();
});

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

type WorkflowRow = {
  id: string;
  name: string;
  auth_type: string;
};

type IssueRow = {
  id: string;
  title: string;
  status: string;
  reportable: boolean;
};

type ReportRow = {
  id: string;
  status: string;
  summary: string;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  return supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Onboarding QA" },
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
