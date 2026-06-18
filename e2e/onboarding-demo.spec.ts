import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
};

test("onboarding checklist does not expose demo seeding", async ({ page, baseURL }) => {
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
    await expect(page.getByText("Brand color")).not.toBeVisible();
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

  await expect(page.getByText("Activation path")).toBeVisible();
  await expect(page.getByText("1 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Seed demo data" })).not.toBeVisible();
  await expect(page.getByText("Demo data")).not.toBeVisible();

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
  expect(clients).toHaveLength(0);
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
