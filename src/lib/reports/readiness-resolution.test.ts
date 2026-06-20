import { describe, expect, it } from "vitest";
import type { ReportQuality } from "@/lib/reports/quality";
import { buildReportReadinessResolutionItems } from "@/lib/reports/readiness-resolution";

describe("buildReportReadinessResolutionItems", () => {
  it("returns only non-ready report checks with concrete resolution actions", () => {
    const items = buildReportReadinessResolutionItems({
      clientId: "client-1",
      quality: qualityFixture,
    });

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.id)).toEqual(["source_data", "sections", "open_risk"]);
    expect(items[0]).toMatchObject({
      guidance: "Run or log at least one check for this client in the report period, then regenerate the report.",
      actions: [
        { type: "link", label: "Open checks", href: "/checks" },
        { type: "link", label: "Open workflows", href: "/workflows" },
      ],
    });
    expect(items[1].actions).toEqual([{ type: "regenerate", label: "Regenerate report" }]);
    expect(items[2].actions).toEqual([
      {
        type: "link",
        label: "Open client issues",
        href: "/issues?clientId=client-1&status=all",
      },
    ]);
  });
});

const qualityFixture: ReportQuality = {
  status: "blocked",
  score: 15,
  blockers: [
    "Report has no check runs for this period.",
    "Report has no saved report sections.",
  ],
  warnings: ["2 high or critical issues are still open for this client."],
  checks: [
    {
      id: "source_data",
      label: "Source data",
      status: "blocked",
      detail: "Report has no check runs for this period.",
    },
    {
      id: "sections",
      label: "Report sections",
      status: "blocked",
      detail: "Report has no saved report sections.",
    },
    {
      id: "recommendations",
      label: "Recommendations",
      status: "ready",
      detail: "1 client-safe recommendations included.",
    },
    {
      id: "open_risk",
      label: "Open high-risk issues",
      status: "warning",
      detail: "2 high or critical issues are still open for this client.",
    },
  ],
};
