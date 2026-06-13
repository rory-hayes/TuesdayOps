import { CreditCard, FileText, KeyRound, PlugZap, ShieldCheck } from "lucide-react";
import { createCheckoutSessionAction, createCustomerPortalSessionAction } from "@/lib/billing/service";
import { formatLimit, getPlanLimits } from "@/lib/billing/limits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";

const integrations = [
  { name: "Supabase", status: "planned", detail: "Auth, Postgres, Storage" },
  { name: "Inngest or Trigger.dev", status: "planned", detail: "Scheduled checks and jobs" },
  { name: "Resend", status: "planned", detail: "Issue alerts and report emails" },
  { name: "Stripe", status: "active", detail: "Billing gate and customer portal" },
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

      {billingNotice ? <p className="rounded-lg bg-success-background p-3 text-sm text-success">{billingNotice}</p> : null}
      {billingError ? <p className="rounded-lg bg-danger-background p-3 text-sm text-danger">{billingError}</p> : null}

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
            <SettingRow label="Plan" value={workspace.agency.plan} />
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
            <div className="flex flex-wrap gap-2">
              <form action={createCheckoutSessionAction}>
                <Button type="submit" size="sm">
                  <CreditCard size={15} aria-hidden="true" />
                  Upgrade
                </Button>
              </form>
              <form action={createCustomerPortalSessionAction}>
                <Button type="submit" variant="secondary" size="sm" disabled={!workspace.agency.billingCustomerId}>
                  <CreditCard size={15} aria-hidden="true" />
                  Manage billing
                </Button>
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
              <p className="mt-1 text-sm text-muted-foreground">Approved MVP services.</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Security readiness</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tenant and secret handling guardrails.</p>
            </div>
            <KeyRound size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadinessItem text="Tenant-owned records carry agency_id in the domain model." />
            <ReadinessItem text="Report preview uses client-safe summaries." />
            <ReadinessItem text="Workflow auth config will be encrypted before persistence." />
            <ReadinessItem text="Raw responses stay out of report output by default." />
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

function ReadinessItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
