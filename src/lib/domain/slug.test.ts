import { describe, expect, it } from "vitest";
import { createSlug } from "./slug";

describe("createSlug", () => {
  it("normalizes names into lowercase hyphenated slugs", () => {
    expect(createSlug("Nova Dental Group")).toBe("nova-dental-group");
    expect(createSlug("  Kinetic   Finance  ")).toBe("kinetic-finance");
  });

  it("drops punctuation and keeps numbers", () => {
    expect(createSlug("Client #42: AI QA")).toBe("client-42-ai-qa");
  });

  it("falls back when the source has no slug-safe characters", () => {
    expect(createSlug("***", "agency")).toBe("agency");
  });
});
