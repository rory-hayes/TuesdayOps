import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsPage } from "@/components/settings/settings-page";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

vi.mock("@/lib/billing/service", () => ({
  createCheckoutSessionAction: "createCheckoutSessionAction",
  createCustomerPortalSessionAction: "createCustomerPortalSessionAction",
}));

describe("SettingsPage billing", () => {
  it("renders the current plan as disabled instead of a checkout choice", () => {
    const html = renderToStaticMarkup(
      <SettingsPage workspace={workspace} data={data} />,
    );

    expect(html).toContain("Current plan");
    expect(html).not.toContain('name="plan" value="starter"');
    expect(html).toContain('name="plan" value="growth"');
    expect(html).toContain('name="plan" value="scale"');
    expect(html).toContain('name="plan" value="agency_plus"');
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
