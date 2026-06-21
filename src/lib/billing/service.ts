"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import { formatBillingError } from "@/lib/billing/feedback";
import { isBillingPlanKey, type BillingPlanKey } from "@/lib/billing/plans";
import { getAppUrl, getStripePriceIdForPlan } from "@/lib/env";
import { getStripeClient } from "@/lib/billing/stripe";
import { assertPersistentRateLimit } from "@/lib/security/rate-limit";
import { formatActionError } from "@/lib/server-actions/feedback";
import { createAdminClient } from "@/lib/supabase/admin";

const agencyPlusContactSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(160),
  contactPhone: z.string().trim().max(80).optional().or(z.literal("")),
  role: z.string().trim().min(2).max(120),
  expectedClients: z.coerce.number().int().min(1).max(10000),
  expectedWorkflows: z.coerce.number().int().min(1).max(100000),
  timeline: z.string().trim().min(2).max(120),
  requirements: z.string().trim().min(10).max(2000),
});

export async function createCheckoutSessionAction(formData?: FormData) {
  const workspace = await requireWorkspace();
  const plan = readCheckoutPlan(formData);

  if (!["owner", "admin"].includes(workspace.role)) {
    redirect(`/settings?billing_error=${encodeURIComponent("Only workspace owners and admins can manage billing.")}`);
  }

  if (plan === workspace.agency.plan) {
    redirect("/settings?billing=current-plan");
  }

  if (plan === "agency_plus") {
    redirect(`/settings?billing_error=${encodeURIComponent("Agency+ is configured by sales. Submit the contact form and we will follow up.")}`);
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

  const admin = createAdminClient();
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

      const { error } = await admin
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
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Checkout could not be opened. Try again or contact support."))}`);
  }

  if (!checkoutUrl) {
    redirect(`/settings?billing_error=${encodeURIComponent("Checkout could not be opened. Try again or contact support.")}`);
  }

  redirect(checkoutUrl);
}

export async function requestAgencyPlusContactAction(formData: FormData) {
  const parsed = agencyPlusContactSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/settings?billing_error=${encodeURIComponent("Complete the Agency+ contact form before sending.")}`);
  }

  const workspace = await requireWorkspace();

  if (!["owner", "admin"].includes(workspace.role)) {
    redirect(`/settings?billing_error=${encodeURIComponent("Only workspace owners and admins can contact sales for Agency+ configuration.")}`);
  }

  try {
    await assertPersistentRateLimit({
      scope: "agency-plus-contact-sales",
      identifier: `${workspace.agency.id}:${workspace.user.id}`,
      limit: 3,
      windowSeconds: 3600,
    });
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Too many contact requests. Try again later."))}`);
  }

  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "billing.sales_contact_requested",
      targetType: "billing_event",
      targetId: workspace.agency.id,
      metadata: {
        plan: "agency_plus",
        agencyName: workspace.agency.name,
        agencySlug: workspace.agency.slug,
        requesterEmail: workspace.user.email ?? null,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone || null,
        role: parsed.data.role,
        expectedClients: parsed.data.expectedClients,
        expectedWorkflows: parsed.data.expectedWorkflows,
        timeline: parsed.data.timeline,
        requirements: parsed.data.requirements,
      },
    });
  } catch (error) {
    redirect(`/settings?billing_error=${encodeURIComponent(formatActionError(error, "Agency+ contact request could not be sent. Try again or contact support."))}`);
  }

  revalidatePath("/settings");
  redirect("/settings?billing=agency-plus-contact-requested");
}

function readCheckoutPlan(formData?: FormData): BillingPlanKey {
  const plan = formData?.get("plan");

  return isBillingPlanKey(plan) ? plan : "growth";
}

export async function createCustomerPortalSessionAction() {
  const workspace = await requireWorkspace();

  if (!["owner", "admin"].includes(workspace.role)) {
    redirect(`/settings?billing_error=${encodeURIComponent("Only workspace owners and admins can manage billing.")}`);
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
    redirect(`/settings?billing_error=${encodeURIComponent(formatBillingError(error, "Billing portal could not be opened. Try again or contact support."))}`);
  }

  if (!portalUrl) {
    redirect(`/settings?billing_error=${encodeURIComponent("Billing portal could not be opened. Try again or contact support.")}`);
  }

  redirect(portalUrl);
}
