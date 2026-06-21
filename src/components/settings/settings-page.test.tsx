/* @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "@/components/settings/settings-page";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { STORED_SLUG_HELP } from "@/lib/domain/slug";

vi.mock("@/lib/billing/service", () => ({
  createCheckoutSessionAction: "createCheckoutSessionAction",
  createCustomerPortalSessionAction: "createCustomerPortalSessionAction",
  requestAgencyPlusContactAction: "requestAgencyPlusContactAction",
}));

afterEach(cleanup);

describe("SettingsPage billing", () => {
  it("renders the current plan as disabled instead of a checkout choice", () => {
    const html = renderToStaticMarkup(
      <SettingsPage workspace={workspace} data={data} />,
    );

    expect(html).toContain("Current plan");
    expect(html).not.toContain('name="plan" value="starter"');
    expect(html).toContain('name="plan" value="growth"');
    expect(html).toContain('name="plan" value="scale"');
    expect(html).not.toContain('name="plan" value="agency_plus"');
    expect(html).toContain("Contact sales");
  });

  it("does not show internal provider integrations as customer settings", () => {
    const html = renderToStaticMarkup(
      <SettingsPage workspace={workspace} data={data} />,
    );

    expect(html).not.toContain("Integrations");
    expect(html).not.toContain("Approved MVP services");
    expect(html).not.toContain("operator managed");
    expect(html).not.toContain("Runtime provider readiness");
  });

  it("does not show report branding controls in customer settings", () => {
    const html = renderToStaticMarkup(
      <SettingsPage workspace={workspace} data={data} />,
    );

    expect(html).not.toContain("Report branding");
    expect(html).not.toContain("Verified sender email");
    expect(html).not.toContain("Reply-to email");
    expect(html).not.toContain("Send test email");
  });

  it("explains the stored agency slug format", () => {
    const html = renderToStaticMarkup(
      <SettingsPage workspace={workspace} data={data} />,
    );

    expect(html).toContain(STORED_SLUG_HELP);
  });

  it("keeps the agency profile card icon decorative instead of exposing a fake control", () => {
    render(<SettingsPage workspace={workspace} data={data} />);

    const agencyProfileHeading = screen.getByRole("heading", { name: "Agency profile" });
    const agencyProfileCard = agencyProfileHeading.closest("section");

    expect(agencyProfileCard).not.toBeNull();
    expect(within(agencyProfileCard!).queryByRole("button")).toBeNull();
    expect(within(agencyProfileCard!).queryByRole("link")).toBeNull();

    const icon = agencyProfileCard!.querySelector("svg");

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");
    expect(icon?.getAttribute("class")).toContain("pointer-events-none");
  });
});

const workspace: WorkspaceContext = {
  role: "owner",
  user: {
    id: "user-1",
    email: "owner@example.com",
  } as WorkspaceContext["user"],
  agency: {
    id: "agency-1",
    name: "Agency",
    slug: "agency",
    primaryColor: "#18181b",
    plan: "starter",
    billingStatus: "active",
  },
};

const data: TuesdayOpsSeedData = {
  agency: {
    id: "agency-1",
    name: "Agency",
    slug: "agency",
    primaryColor: "#18181b",
    plan: "starter",
    billingStatus: "active",
  },
  clients: [],
  workflows: [],
  checks: [],
  checkRuns: [],
  issues: [],
  testPacks: [],
  testCases: [],
  testRuns: [],
  workflowApiKeys: [],
  reports: [],
  reportItems: [],
};
