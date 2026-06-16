import { describe, expect, it } from "vitest";
import { getLandingContent } from "@/lib/marketing/landing";

describe("getLandingContent", () => {
  it("keeps the public offer focused on the agency workflow proof loop", () => {
    const content = getLandingContent();
    const text = [
      content.hero.title,
      content.hero.description,
      ...content.sections.flatMap((section) => [
        section.title,
        section.description,
        ...section.items.map((item) => `${item.label} ${item.description}`),
      ]),
    ].join(" ");

    expect(content.hero.title).toBe("TuesdayOps");
    expect(text).toContain("Agency");
    expect(text).toContain("Client");
    expect(text).toContain("Workflow");
    expect(text).toContain("Check Run");
    expect(text).toContain("Issue");
    expect(text).toContain("Monthly Report");
  });

  it("does not advertise intentionally deferred scope", () => {
    const content = getLandingContent();
    const text = JSON.stringify(content).toLowerCase();

    expect(text).not.toContain("slack");
    expect(text).not.toContain("posthog");
    expect(text).not.toContain("client portal");
    expect(text).not.toContain("browser synthetic");
  });
});
