import { SettingsPage } from "@/components/settings/settings-page";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";

type SettingsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsRoute({ searchParams }: SettingsRouteProps) {
  const workspace = await requireWorkspace();
  const [data, params] = await Promise.all([getOperationalData(workspace.agency), searchParams]);

  return (
    <SettingsPage
      workspace={workspace}
      data={data}
      billingNotice={readBillingNotice(readParam(params.billing))}
      billingError={readParam(params.billing_error)}
    />
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readBillingNotice(value: string | undefined): string | undefined {
  if (value === "checkout-success") {
    return "Checkout completed. Subscription state will update after Stripe sends the webhook.";
  }

  if (value === "checkout-canceled") {
    return "Checkout was canceled.";
  }

  if (value === "portal-return") {
    return "Returned from the customer portal.";
  }

  return undefined;
}
