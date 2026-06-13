import { CreditCard, KeyRound, Palette, PlugZap, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { WorkspaceContext } from "@/lib/auth/workspace";

const integrations = [
  { name: "Supabase", status: "planned", detail: "Auth, Postgres, Storage" },
  { name: "Inngest or Trigger.dev", status: "planned", detail: "Scheduled checks and jobs" },
  { name: "Resend", status: "planned", detail: "Issue alerts and report emails" },
  { name: "Stripe", status: "planned", detail: "Billing gate and customer portal" },
];

export function SettingsPage({ workspace }: { workspace: WorkspaceContext }) {
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
            <Button variant="secondary" size="sm">
              <CreditCard size={15} aria-hidden="true" />
              Manage billing
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Report branding</h2>
              <p className="mt-1 text-sm text-muted-foreground">White-label report appearance.</p>
            </div>
            <Palette size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Primary color" value={workspace.agency.primaryColor} />
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div
                className="size-10 rounded-md border border-border"
                style={{ backgroundColor: workspace.agency.primaryColor }}
              />
              <div>
                <p className="text-sm font-medium">Client-facing reports</p>
                <p className="mt-1 text-xs text-muted-foreground">Logo and color fields will sync to PDFs.</p>
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

function ReadinessItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
