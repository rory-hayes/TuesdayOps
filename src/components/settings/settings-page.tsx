import { CreditCard, FileText, PlugZap, ShieldCheck } from "lucide-react";
import { createCheckoutSessionAction, createCustomerPortalSessionAction } from "@/lib/billing/service";
import { formatLimit, getPlanLimits } from "@/lib/billing/limits";
import { getBillingPlanName, PUBLIC_BILLING_PLANS } from "@/lib/billing/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

const integrations = [
  { name: "Supabase", status: "operator managed", detail: "Auth, Postgres, Storage" },
  { name: "Supabase Cron", status: "operator managed", detail: "Scheduled checks and jobs" },
  { name: "Resend", status: "operator managed", detail: "Issue alerts and report emails" },
  { name: "Stripe", status: "operator managed", detail: "Billing gate and customer portal" },
];

export function SettingsPage({
  workspace,
  data,
  billingNotice,
  billingError,
}: {
  workspace: WorkspaceContext;
  data: TuesdayOpsSeedData;
  billingNotice?: string;
  billingError?: string;
}) {
  const activeClients = data.clients.filter((client) => !client.archived).length;
  const workflows = data.workflows.length;
  const limits = getPlanLimits(workspace.agency.plan, workspace.agency.billingStatus);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section>
        <p className="text-sm font-medium text-primary">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
          Agency workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Branding, billing, integrations, and security controls for the agency account.
        </p>
      </section>

      <PageFeedback notice={billingNotice} error={billingError} />

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Agency profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">Workspace identity and plan state.</p>
            </div>
            <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Agency" value={workspace.agency.name} />
            <SettingRow label="Slug" value={workspace.agency.slug} />
            <SettingRow label="Plan" value={getBillingPlanName(workspace.agency.plan)} />
            <SettingRow label="Billing status" value={workspace.agency.billingStatus} />
            <SettingRow label="Trial ends" value={formatDate(workspace.agency.trialEndsAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Billing</h2>
              <p className="mt-1 text-sm text-muted-foreground">Subscription state and plan usage.</p>
            </div>
            <CreditCard size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <UsageTile label="Clients" value={activeClients} limit={limits.clients} />
              <UsageTile label="Workflows" value={workflows} limit={limits.workflows} />
            </div>
            <div className="grid gap-3">
              {PUBLIC_BILLING_PLANS.map((plan) => {
                const isCurrentPlan = workspace.agency.plan === plan.key;

                return (
                  <div key={plan.key} className="rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{plan.name}</p>
                          {plan.featured ? <Badge variant="muted">main plan</Badge> : null}
                          {isCurrentPlan ? <Badge variant="success">current</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {plan.priceLabel}
                          {plan.cadence} - {plan.limitLabel}
                        </p>
                      </div>
                      {isCurrentPlan ? (
                        <Button type="button" size="sm" variant="secondary" disabled>
                          <CreditCard size={15} aria-hidden="true" />
                          Current plan
                        </Button>
                      ) : (
                        <form action={createCheckoutSessionAction}>
                          <input type="hidden" name="plan" value={plan.key} />
                          <FormSubmitButton type="submit" size="sm" pendingLabel="Opening...">
                            <CreditCard size={15} aria-hidden="true" />
                            Choose
                          </FormSubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={createCustomerPortalSessionAction}>
                <FormSubmitButton
                  type="submit"
                  variant="secondary"
                  size="sm"
                  pendingLabel="Opening..."
                  disabled={!workspace.agency.billingCustomerId}
                >
                  <CreditCard size={15} aria-hidden="true" />
                  Manage billing
                </FormSubmitButton>
              </form>
            </div>
            {!workspace.agency.billingCustomerId ? (
              <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                Customer portal unlocks after checkout creates a Stripe customer.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Report branding</h2>
              <p className="mt-1 text-sm text-muted-foreground">Client-ready report identity.</p>
            </div>
            <FileText size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <div>
                <p className="text-sm font-medium">Client-facing reports</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reports use your agency name and client-safe summaries.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Integrations</h2>
              <p className="mt-1 text-sm text-muted-foreground">Approved MVP services for this workspace.</p>
            </div>
            <PlugZap size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration.name} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{integration.detail}</p>
                </div>
                <Badge variant="muted">{integration.status}</Badge>
              </div>
            ))}
            <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
              Runtime provider readiness is checked by operators through the health endpoint, not inferred from workspace settings.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function UsageTile({ label, value, limit }: { label: string; value: number; limit: number }) {
  const percent = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">
          {value} / {formatLimit(limit)}
        </p>
      </div>
      {Number.isFinite(limit) ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <Badge variant="success" className="mt-3">unlimited</Badge>
      )}
    </div>
  );
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
