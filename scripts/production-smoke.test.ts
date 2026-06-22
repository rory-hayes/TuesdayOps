import { describe, expect, it } from "vitest";
import {
  formatProductionSmokeReport,
  runProductionSmoke,
} from "../src/lib/production/smoke";

const productionSmokeUrl =
  process.env.PRODUCTION_SMOKE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://www.maintainflow.io";

describe("production smoke", () => {
  it(
    `passes public production checks for ${productionSmokeUrl}`,
    async () => {
      const result = await runProductionSmoke({ appUrl: productionSmokeUrl });
      const report = formatProductionSmokeReport(result);

      console.info(`\n${report}`);
      expect(result.ok, report).toBe(true);
    },
    30_000,
  );
});
