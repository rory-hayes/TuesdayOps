import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceContext = {
  user: User;
  agency: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    plan: string;
    billingCustomerId?: string;
    billingSubscriptionId?: string;
    billingStatus: string;
    billingPriceId?: string;
    billingCurrentPeriodEnd?: string;
    trialEndsAt?: string;
    reportSenderName?: string;
    reportSenderEmail?: string;
    reportReplyToEmail?: string;
    reportSenderDomain?: string;
    reportSenderDomainStatus?: "pending" | "verified" | "failed";
  };
  role: "owner" | "admin" | "member" | "viewer";
};

type MembershipRow = {
  role: WorkspaceContext["role"];
  agencies:
    | {
        id: string;
        name: string;
        slug: string;
        primary_color: string;
        plan: string;
        billing_customer_id: string | null;
        billing_subscription_id: string | null;
        billing_status: string;
        billing_price_id: string | null;
        billing_current_period_end: string | null;
        trial_ends_at: string | null;
        report_sender_name: string | null;
        report_sender_email: string | null;
        report_reply_to_email: string | null;
        report_sender_domain: string | null;
        report_sender_domain_status: "pending" | "verified" | "failed" | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        primary_color: string;
        plan: string;
        billing_customer_id: string | null;
        billing_subscription_id: string | null;
        billing_status: string;
        billing_price_id: string | null;
        billing_current_period_end: string | null;
        trial_ends_at: string | null;
        report_sender_name: string | null;
        report_sender_email: string | null;
        report_reply_to_email: string | null;
        report_sender_domain: string | null;
        report_sender_domain_status: "pending" | "verified" | "failed" | null;
      }[];
};

export async function getWorkspaceContext(): Promise<{
  user: User | null;
  workspace: WorkspaceContext | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, workspace: null };
  }

  const { data, error } = await supabase
    .from("memberships")
    .select(
      "role, agencies(id, name, slug, primary_color, plan, billing_customer_id, billing_subscription_id, billing_status, billing_price_id, billing_current_period_end, trial_ends_at, report_sender_name, report_sender_email, report_reply_to_email, report_sender_domain, report_sender_domain_status)",
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load workspace: ${error.message}`);
  }

  if (!data) {
    return { user, workspace: null };
  }

  const membership = data as MembershipRow;
  const agency = Array.isArray(membership.agencies)
    ? membership.agencies[0]
    : membership.agencies;

  if (!agency) {
    return { user, workspace: null };
  }

  return {
    user,
    workspace: {
      user,
      role: membership.role,
      agency: {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        primaryColor: agency.primary_color,
        plan: agency.plan,
        billingCustomerId: agency.billing_customer_id ?? undefined,
        billingSubscriptionId: agency.billing_subscription_id ?? undefined,
        billingStatus: agency.billing_status ?? "trialing",
        billingPriceId: agency.billing_price_id ?? undefined,
        billingCurrentPeriodEnd: agency.billing_current_period_end ?? undefined,
        trialEndsAt: agency.trial_ends_at ?? undefined,
        reportSenderName: agency.report_sender_name ?? undefined,
        reportSenderEmail: agency.report_sender_email ?? undefined,
        reportReplyToEmail: agency.report_reply_to_email ?? undefined,
        reportSenderDomain: agency.report_sender_domain ?? undefined,
        reportSenderDomainStatus: agency.report_sender_domain_status ?? undefined,
      },
	    },
  };
}

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const { user, workspace } = await getWorkspaceContext();

  if (!user) {
    redirect("/sign-in");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  return workspace;
}

export async function requireAuthenticatedUser(): Promise<User> {
  const { user } = await getWorkspaceContext();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
