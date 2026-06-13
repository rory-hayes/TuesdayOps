import Link from "next/link";
import { Beaker, Plus, Play } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createCheckAction, runCheckAction } from "@/lib/checks/service";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function ChecksPage({
  data,
  error,
}: {
  data: TuesdayOpsSeedData;
  error?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Checks</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            Health checks and synthetic test packs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Lightweight QA checks that catch broken endpoints, schema drift, latency spikes, and unsafe output.
          </p>
        </div>
        <Badge variant="muted">{data.checks.length} enabled</Badge>
      </section>

      {error ? <p className="rounded-lg bg-danger-background p-3 text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Create health check</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Attach a lightweight HTTP assertion pack to a registered workflow.
          </p>
        </CardHeader>
        <CardContent>
          {data.workflows.length ? (
            <form action={createCheckAction} className="grid gap-3 md:grid-cols-5">
              <label className="block text-sm font-medium md:col-span-2">
                Workflow
                <select
                  required
                  name="workflowId"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {data.workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Check name" name="name" placeholder="Endpoint health check" required />
              <Input label="Expected status" name="expectedStatus" placeholder="200" type="number" required />
              <Input label="Max latency ms" name="maxLatencyMs" placeholder="5000" type="number" required />
              <Input label="Timeout ms" name="timeoutMs" placeholder="10000" type="number" required />
              <Button type="submit" className="md:col-span-5 md:w-fit">
                <Plus size={15} aria-hidden="true" />
                Add check
              </Button>
            </form>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Register a workflow before adding health checks.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Enabled checks</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scheduled monitors attached to workflows.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.checks.length ? data.checks.map((check) => {
              const workflow = data.workflows.find((candidate) => candidate.id === check.workflowId);

              return (
                <div key={check.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <Link href={`/workflows/${workflow?.id}`} className="mt-1 block text-sm text-primary">
                        {workflow?.name}
                      </Link>
                    </div>
                    <StatusBadge status={check.latestStatus} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="muted">{check.type}</Badge>
                    <Badge variant="muted">{check.schedule}</Badge>
                    <Badge variant="muted">{check.assertionCount} assertions</Badge>
                    <form action={runCheckAction}>
                      <input type="hidden" name="checkId" value={check.id} />
                      <Button type="submit" size="sm">
                        <Play size={14} aria-hidden="true" />
                        Run
                      </Button>
                    </form>
                  </div>
                </div>
              );
            }) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                No endpoint checks have been created yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Synthetic test packs</h2>
              <p className="mt-1 text-sm text-muted-foreground">Regression cases for workflow behavior.</p>
            </div>
            <Beaker size={18} className="text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            {data.testPacks.length ? (
              data.testPacks.map((pack) => {
                const workflow = data.workflows.find((candidate) => candidate.id === pack.workflowId);

                return (
                  <div key={pack.id} className="rounded-lg bg-muted p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{pack.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{workflow?.name}</p>
                      </div>
                      <Badge variant={pack.passRate >= 90 ? "success" : "warning"}>
                        {formatPercentage(pack.passRate)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{pack.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {pack.caseCount} cases / last run {formatRelativeTime(pack.lastRunAt)}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Synthetic test packs start in the next milestone after endpoint checks are reliable.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
