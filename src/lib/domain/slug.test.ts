import { describe, expect, it } from "vitest";
import { createSlug, parseOptionalSlug } from "./slug";

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

  it("accepts explicit lowercase slugs with numbers and hyphens", () => {
    expect(
      parseOptionalSlug({
        value: "client-42-ai-qa",
        source: "Ignored Client",
        fallback: "client",
      }),
    ).toEqual({
      success: true,
      slug: "client-42-ai-qa",
    });
  });

  it("generates a slug from the source when the explicit field is blank", () => {
    expect(
      parseOptionalSlug({
        value: "   ",
        source: "Client #42: AI QA",
        fallback: "client",
      }),
    ).toEqual({
      success: true,
      slug: "client-42-ai-qa",
    });
  });

  it("generates a slug from the source when the explicit field is omitted", () => {
    expect(
      parseOptionalSlug({
        source: "Agency Name",
        fallback: "agency",
      }),
    ).toEqual({
      success: true,
      slug: "agency-name",
    });
  });

  it("rejects explicit slugs with spaces or punctuation instead of silently rewriting them", () => {
    expect(
      parseOptionalSlug({
        value: "This Is My Agency!@",
        source: "Agency Name",
        fallback: "agency",
      }),
    ).toEqual({
      success: false,
      message: "Use lowercase letters, numbers, and single hyphens only.",
    });
  });
});
