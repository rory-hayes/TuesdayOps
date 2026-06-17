import { defineConfig, devices } from "@playwright/test";

const workerCount = Number(process.env.PLAYWRIGHT_WORKERS ?? 1);
const safeWorkerCount = Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 1;
const baseURL = process.env.PRODUCTION_E2E_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "true";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  workers: safeWorkerCount,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: "npm run dev -- --port 3000",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
