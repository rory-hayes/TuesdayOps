import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { recordAuditEventSafely } from "@/lib/audit/events";
import { buildAgencyBillingUpdate, getAgencyIdFromCheckoutSession, isSubscriptionEvent } from "@/lib/billing/webhook";
import { getStripeClient } from "@/lib/billing/stripe";
import { getStripeWebhookSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = getStripeClient().webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook verification failed." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: existingEvent, error: existingEventError } = await supabase
    .from("billing_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEventError) {
    return NextResponse.json({ error: existingEventError.message }, { status: 500 });
  }

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let agencyId: string | null = null;

  try {
    if (event.type === "checkout.session.completed") {
      agencyId = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (isSubscriptionEvent(event)) {
      agencyId = await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook processing failed." },
      { status: 500 },
    );
  }

  const { error: insertEventError } = await supabase.from("billing_events").insert({
    id: event.id,
    agency_id: agencyId,
    type: event.type,
  });

  if (insertEventError) {
    return NextResponse.json({ error: insertEventError.message }, { status: 500 });
  }

  if (agencyId) {
    await recordAuditEventSafely({
      supabase,
      agencyId,
      actorUserId: null,
      action: "billing.webhook_processed",
      targetType: "billing_event",
      targetId: event.id,
      metadata: { eventType: event.type },
    });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<string | null> {
  const agencyId = getAgencyIdFromCheckoutSession(session);

  if (!agencyId) {
    return null;
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const supabase = createAdminClient();

  if (customerId) {
    const { error } = await supabase
      .from("agencies")
      .update({ billing_customer_id: customerId })
      .eq("id", agencyId);

    if (error) {
      throw error;
    }
  }

  if (typeof session.subscription === "string") {
    const subscription = await getStripeClient().subscriptions.retrieve(session.subscription);
    await updateAgencyFromSubscription(subscription);
  }

  return agencyId;
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<string | null> {
  return updateAgencyFromSubscription(subscription);
}

async function updateAgencyFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const update = buildAgencyBillingUpdate(subscription);
  const customerId = update.billing_customer_id;
  const supabase = createAdminClient();
  const { data: agencyBySubscription } = await supabase
    .from("agencies")
    .select("id")
    .eq("billing_subscription_id", subscription.id)
    .maybeSingle();
  const agencyId = agencyBySubscription?.id ?? null;

  if (agencyId) {
    const { error } = await supabase.from("agencies").update(update).eq("id", agencyId);

    if (error) {
      throw error;
    }

    return agencyId;
  }

  if (!customerId) {
    return null;
  }

  const { data: agencyByCustomer, error: customerLoadError } = await supabase
    .from("agencies")
    .select("id")
    .eq("billing_customer_id", customerId)
    .maybeSingle();

  if (customerLoadError) {
    throw customerLoadError;
  }

  if (!agencyByCustomer) {
    return null;
  }

  const { error } = await supabase.from("agencies").update(update).eq("id", agencyByCustomer.id);

  if (error) {
    throw error;
  }

  return agencyByCustomer.id;
}
