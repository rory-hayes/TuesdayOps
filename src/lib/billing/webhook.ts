import type Stripe from "stripe";
import type { BillingStatus } from "@/lib/billing/limits";

type SubscriptionLike = {
  id: string;
  customer: string | { id: string } | null;
  status: string;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      } | null;
    }>;
  };
};

type CheckoutSessionLike = {
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

export function normalizeStripeSubscriptionStatus(status: string): BillingStatus {
  if (status === "trialing") {
    return "trialing";
  }

  if (status === "active") {
    return "active";
  }

  if (status === "past_due" || status === "unpaid" || status === "paused") {
    return "past_due";
  }

  if (status === "canceled") {
    return "canceled";
  }

  return "incomplete";
}

export function buildAgencyBillingUpdate(subscription: SubscriptionLike) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const billingStatus = normalizeStripeSubscriptionStatus(subscription.status);

  return {
    billing_customer_id: customerId ?? null,
    billing_subscription_id: subscription.id,
    billing_status: billingStatus,
    billing_price_id: priceId,
    billing_current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    plan: planForPriceId(priceId, billingStatus),
  };
}

export function getAgencyIdFromCheckoutSession(session: CheckoutSessionLike): string | null {
  return session.metadata?.agency_id ?? session.client_reference_id ?? null;
}

export function isSubscriptionEvent(event: Stripe.Event): boolean {
  return [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ].includes(event.type);
}

function planForPriceId(priceId: string | null, billingStatus: BillingStatus): string {
  if (!priceId || billingStatus === "canceled") {
    return "starter";
  }

  return "growth";
}
