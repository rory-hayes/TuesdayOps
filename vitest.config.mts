import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "src/app/api/**/*.ts",
        "src/lib/alerts/issue-alerts.ts",
        "src/lib/alerts/service.ts",
        "src/lib/audit/events.ts",
        "src/lib/billing/feedback.ts",
        "src/lib/billing/limits.ts",
        "src/lib/billing/webhook.ts",
        "src/lib/checks/assertions.ts",
        "src/lib/checks/execution.ts",
        "src/lib/checks/runner.ts",
        "src/lib/checks/scheduled-runner.ts",
        "src/lib/checks/scheduler.ts",
        "src/lib/domain/slug.ts",
        "src/lib/domain/summaries.ts",
        "src/lib/env.ts",
        "src/lib/formatting.ts",
        "src/lib/issues/engine.ts",
        "src/lib/issues/operations.ts",
        "src/lib/onboarding/progress.ts",
        "src/lib/production/**/*.ts",
        "src/lib/reports/aggregation.ts",
        "src/lib/reports/pdf.ts",
        "src/lib/reports/quality.ts",
        "src/lib/reports/sanitize.ts",
        "src/lib/reports/send-feedback.ts",
        "src/lib/security/endpoint-url.ts",
        "src/lib/security/rate-limit.ts",
        "src/lib/security/secrets.ts",
        "src/lib/server-actions/mutation-result.ts",
        "src/lib/test-packs/runner.ts",
        "src/lib/utils.ts",
        "src/lib/workflows/onboarding.ts",
      ],
      exclude: [
        "src/lib/domain/types.ts",
        "src/lib/supabase/**/*.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
