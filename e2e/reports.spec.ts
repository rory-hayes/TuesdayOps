import fs from "node:fs";
import { expect, test } from "@playwright/test";

const localEnv = loadLocalEnv();
const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? localEnv.RESEND_API_KEY,
};

test("monthly report can be generated, exported as PDF, and sent or safely failed", async ({
  page,
  baseURL,
}) => {
  test.skip(!hasRequiredEnv(), "Report E2E requires Supabase service credentials.");

  const appUrl = baseURL ?? "http://localhost:3000";
  const runId = Date.now();
  const email = `qa-report-${runId}@example.invalid`;
  const password = `QaReport-${runId}!`;
  const agencyName = `QA Report Agency ${runId}`;
  const agencySlug = `qa-report-${runId}`;
  const clientName = `Report Client ${runId}`;
  const workflowName = `Report Failing Workflow ${runId}`;
  const endpointUrl = `${appUrl}/api/e2e-report-missing-${runId}`;

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
  await page.getByLabel("Report email").fill(`qa-report-${runId}@example.invalid`);
  await page.getByLabel("Notes").fill("Report E2E client.");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText(clientName)).toBeVisible();

  const client = await poll(async () => {
    const rows = await getRows<ClientRow>(
      "clients",
      `name=eq.${encodeURIComponent(clientName)}&select=id,name`,
    );
    return rows[0] ?? null;
  }, "created client");

  await page.goto("/workflows", { waitUntil: "domcontentloaded" });
  await page.selectOption('select[name="clientId"]', { label: clientName });
  await page.getByLabel("Workflow name").fill(workflowName);
  await page.getByLabel("Endpoint URL").fill(endpointUrl);
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

  const runForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Run" }) });
  await runForm.getByRole("button", { name: "Run" }).click();

  await poll(async () => {
    const rows = await getRows<IssueRow>(
      "issues",
      `workflow_id=eq.${workflowId}&select=id,status,title,created_at`,
    );
    return rows[0] ?? null;
  }, "issue from failed manual check");

  await page.goto("/reports", { waitUntil: "domcontentloaded" });
  const reportForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Generate" }) });
  await reportForm.getByLabel("Client").selectOption({ label: clientName });
  await reportForm.getByLabel("Period").fill("2026-06");
  await reportForm.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText(`${clientName} June 2026`)).toBeVisible();
  await expect(page.getByText("Workflow maintenance proof")).toBeVisible();

  const report = await poll(async () => {
    const rows = await getRows<ReportRow>(
      "reports",
      `client_id=eq.${client.id}&period=eq.2026-06&select=id,status,summary,metrics_json,pdf_url,send_error`,
    );
    return rows[0] ?? null;
  }, "generated report");
  expect(report.status).toBe("draft");
  expect(report.summary).toContain(clientName);
  expect(report.metrics_json.checksRun).toBeGreaterThanOrEqual(1);
  expect(report.metrics_json.issuesCaught).toBeGreaterThanOrEqual(1);

  const pdfForm = page.locator("form").filter({ has: page.getByRole("button", { name: "PDF" }) });
  await pdfForm.getByRole("button", { name: "PDF" }).click();

  const reportWithPdf = await poll(async () => {
    const rows = await getRows<ReportRow>(
      "reports",
      `id=eq.${report.id}&select=id,status,summary,metrics_json,pdf_url,send_error`,
    );
    return rows.find((row) => row.pdf_url) ?? null;
  }, "generated report PDF");
  expect(reportWithPdf.status).toBe("ready_to_send");
  expect(reportWithPdf.pdf_url).toBe(`/api/reports/${report.id}/download`);

  const pdfResponse = await page.request.get(`${appUrl}${reportWithPdf.pdf_url}`);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  expect((await pdfResponse.body()).toString("latin1").startsWith("%PDF-1.4")).toBe(true);

  await page.goto("/reports", { waitUntil: "domcontentloaded" });
  const sendForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Send" }) });
  await sendForm.getByRole("button", { name: "Send" }).click();

  const sentReport = await poll(async () => {
    const rows = await getRows<ReportRow>(
      "reports",
      `id=eq.${report.id}&select=id,status,summary,metrics_json,pdf_url,send_error`,
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    if (env.RESEND_API_KEY) {
      return row.status === "sent" ? row : null;
    }

    return row.status === "failed" && row.send_error ? row : null;
  }, "report send status");

  if (env.RESEND_API_KEY) {
    expect(sentReport.status).toBe("sent");
    expect(sentReport.send_error).toBeNull();
  } else {
    expect(sentReport.status).toBe("failed");
    expect(sentReport.send_error).toContain("Missing RESEND_API_KEY");
  }
});

type ClientRow = {
  id: string;
  name: string;
};

type IssueRow = {
  id: string;
  status: string;
  title: string;
  created_at: string;
};

type ReportRow = {
  id: string;
  status: string;
  summary: string;
  metrics_json: {
    checksRun: number;
    issuesCaught: number;
  };
  pdf_url: string | null;
  send_error: string | null;
};

async function createConfirmedUser({ email, password }: { email: string; password: string }) {
  await supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Report QA" },
    }),
  });
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
