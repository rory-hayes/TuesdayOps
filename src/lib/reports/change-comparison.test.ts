import { describe, expect, it } from "vitest";
import { buildChangeComparison, buildChangeComparisonReportItem } from "./change-comparison";

describe("model and prompt change comparison", () => {
  it("groups run metadata into lightweight pass-rate, latency, and cost comparisons", () => {
    const comparison = buildChangeComparison([
      {
        status: "healthy",
        latencyMs: 300,
        costEstimate: 0.01,
        model: "gpt-4.1-mini",
        promptVersion: "v1",
        completedAt: "2026-06-01T10:00:00.000Z",
      },
      {
        status: "failed",
        latencyMs: 500,
        costEstimate: 0.02,
        model: "gpt-4.1-mini",
        promptVersion: "v1",
        completedAt: "2026-06-01T11:00:00.000Z",
      },
      {
        status: "healthy",
        latencyMs: 220,
        costEstimate: 0.014,
        model: "gpt-4.1-mini",
        promptVersion: "v2",
        completedAt: "2026-06-02T10:00:00.000Z",
      },
    ]);

    expect(comparison.groups).toEqual([
      {
        label: "gpt-4.1-mini / v2",
        model: "gpt-4.1-mini",
        promptVersion: "v2",
        runs: 1,
        passRate: 100,
        averageLatencyMs: 220,
        averageCostEstimate: 0.014,
        latestRunAt: "2026-06-02T10:00:00.000Z",
      },
      {
        label: "gpt-4.1-mini / v1",
        model: "gpt-4.1-mini",
        promptVersion: "v1",
        runs: 2,
        passRate: 50,
        averageLatencyMs: 400,
        averageCostEstimate: 0.015,
        latestRunAt: "2026-06-01T11:00:00.000Z",
      },
    ]);
  });

  it("builds a report item without pretending to be a full eval suite", () => {
    const item = buildChangeComparisonReportItem(buildChangeComparison([
      {
        status: "healthy",
        latencyMs: 220,
        costEstimate: 0.014,
        model: "gpt-4.1-mini",
        promptVersion: "v2",
        completedAt: "2026-06-02T10:00:00.000Z",
      },
    ]));

    expect(item).toEqual({
      category: "model_prompt_changes",
      title: "Model/prompt changes tested",
      body: "1 change validation group logged. Latest gpt-4.1-mini / v2: 100% pass rate, 220ms average latency, 0.014 average cost.",
      sortOrder: 50,
    });
  });
});
