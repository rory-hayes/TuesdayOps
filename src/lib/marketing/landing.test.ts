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

    expect(content.hero.title).toBe("Tuesday");
    expect(content.sections[0].title).toBe("How it works");
    expect(content.sections[0].items.map((item) => item.label)).toEqual([
      "Connect workflow endpoint",
      "Run health checks",
      "Create issues",
      "Resolve maintenance work",
      "Send proof report",
    ]);
    expect(text).toContain("client workflow");
    expect(text).toContain("failed checks");
    expect(text).toContain("next-month recommendations");
    expect(text).not.toContain("TuesdayOps");
  });

  it("does not advertise intentionally deferred scope", () => {
    const content = getLandingContent();
    const text = JSON.stringify(content).toLowerCase();

    expect(text).not.toContain("slack");
    expect(text).not.toContain("posthog");
    expect(text).not.toContain("client portal");
    expect(text).not.toContain("browser synthetic");
  });

  it("uses customer-base proof metrics instead of testimonial quotes", () => {
    const content = getLandingContent();

    expect(content.customerBase.metrics).toEqual([
      expect.objectContaining({
        value: "200+",
        label: "customers",
      }),
      expect.objectContaining({
        value: "2,500+",
        label: "active workflows monitored",
      }),
      expect.objectContaining({
        value: "1,200+",
        label: "proof reports generated",
      }),
    ]);

    const customerBaseText = JSON.stringify(content.customerBase).toLowerCase();

    expect(customerBaseText).not.toContain("ai agency founder");
    expect(customerBaseText).not.toContain("delivery lead");
    expect(customerBaseText).not.toContain("clients do not ask for trace waterfalls");
    expect(customerBaseText).not.toContain("the uncomfortable part");
  });
});
