"use server";

import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth/workspace";
import { formatBillingError } from "@/lib/billing/feedback";
import { isBillingPlanKey, type BillingPlanKey } from "@/lib/billing/plans";
import { getAppUrl, getStripePriceIdForPlan } from "@/lib/env";
import { getStripeClient } from "@/lib/billing/stripe";
import { assertPersistentRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function createCheckoutSessionAction(formData?: FormData) {
  const workspace = await requireWorkspace();
  const plan = readCheckoutPlan(formData);

  if (!["owner", "admin"].includes(workspace.role)) {
    redirect(`/settings?billing_error=${encodeURIComponent("Only owners and admins can manage billing.")}`);
  }

  try {
    await assertPersistentRateLimit({
      scope: "stripe-checkout-start",
      identifier: `${workspace.agency.id}:${workspace.user.id}`,
      limit: 5,
      windowSeconds: 600,
    });
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Too many checkout attempts. Try again later."))}`);
  }

  let stripe;
  let priceId;
  let appUrl;

  try {
    stripe = getStripeClient();
    priceId = getStripePriceIdForPlan(plan);
    appUrl = getAppUrl();
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error))}`);
  }

  const supabase = await createClient();
  let customerId = workspace.agency.billingCustomerId;
  let checkoutUrl: string | null = null;

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: workspace.agency.name,
        email: workspace.user.email ?? undefined,
        metadata: {
          agency_id: workspace.agency.id,
        },
      });
      customerId = customer.id;

      const { error } = await supabase
        .from("agencies")
        .update({ billing_customer_id: customerId })
        .eq("id", workspace.agency.id);

      if (error) {
        throw new Error(error.message);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: workspace.agency.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings?billing=checkout-success`,
      cancel_url: `${appUrl}/settings?billing=checkout-canceled`,
      metadata: {
        agency_id: workspace.agency.id,
        plan,
      },
      subscription_data: {
        metadata: {
          agency_id: workspace.agency.id,
          plan,
        },
      },
    });
    checkoutUrl = session.url;
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Stripe Checkout could not be started."))}`);
  }

  if (!checkoutUrl) {
    redirect(`/settings?billing_error=${encodeURIComponent("Stripe did not return a checkout URL.")}`);
  }

  redirect(checkoutUrl);
}

function readCheckoutPlan(formData?: FormData): BillingPlanKey {
  const plan = formData?.get("plan");

  return isBillingPlanKey(plan) ? plan : "growth";
}

export async function createCustomerPortalSessionAction() {
  const workspace = await requireWorkspace();

  if (!["owner", "admin"].includes(workspace.role)) {
    redirect(`/settings?billing_error=${encodeURIComponent("Only owners and admins can manage billing.")}`);
  }

  if (!workspace.agency.billingCustomerId) {
    redirect(`/settings?billing_error=${encodeURIComponent("Start a subscription before opening the customer portal.")}`);
  }

  try {
    await assertPersistentRateLimit({
      scope: "stripe-portal-start",
      identifier: `${workspace.agency.id}:${workspace.user.id}`,
      limit: 10,
      windowSeconds: 600,
    });
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Too many billing portal attempts. Try again later."))}`);
  }

  let stripe;
  let appUrl;

  try {
    stripe = getStripeClient();
    appUrl = getAppUrl();
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error))}`);
  }

  let portalUrl: string | null = null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.agency.billingCustomerId,
      return_url: `${appUrl}/settings?billing=portal-return`,
    });

    portalUrl = session.url;
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Stripe customer portal could not be started."))}`);
  }

  if (!portalUrl) {
    redirect(`/settings?billing_error=${encodeURIComponent("Stripe did not return a customer portal URL.")}`);
  }

  redirect(portalUrl);
}
