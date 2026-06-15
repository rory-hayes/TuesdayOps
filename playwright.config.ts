import { defineConfig, devices } from "@playwright/test";

const workerCount = Number(process.env.PLAYWRIGHT_WORKERS ?? 1);
const safeWorkerCount = Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 1;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
  webServer: {
    command: "npm run dev -- --port 3000",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
