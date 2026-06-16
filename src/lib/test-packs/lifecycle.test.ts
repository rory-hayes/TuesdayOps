import { describe, expect, it } from "vitest";
import {
  buildTestCaseArchiveUpdate,
  buildTestCaseUpdate,
  buildTestPackDisableUpdate,
  buildTestPackUpdate,
} from "./lifecycle";

describe("test-pack lifecycle helpers", () => {
  it("updates test-pack metadata without changing enabled state", () => {
    expect(buildTestPackUpdate({ name: "Regression Pack", description: "Happy path checks" })).toEqual({
      name: "Regression Pack",
      description: "Happy path checks",
    });
  });

  it("disables test packs instead of deleting synthetic history", () => {
    expect(buildTestPackDisableUpdate()).toEqual({
      enabled: false,
    });
  });

  it("updates test-case metadata and assertions", () => {
    const assertions = [{ type: "status_code", expected: 200 }];

    expect(buildTestCaseUpdate({
      name: "Happy path",
      inputJson: { leadId: "qa-001" },
      assertionsJson: assertions,
    })).toEqual({
      name: "Happy path",
      input_json: { leadId: "qa-001" },
      assertions_json: assertions,
    });
  });

  it("archives test cases without deleting historical synthetic runs", () => {
    expect(buildTestCaseArchiveUpdate("2026-06-16T11:45:00.000Z")).toEqual({
      archived_at: "2026-06-16T11:45:00.000Z",
    });
  });
});
