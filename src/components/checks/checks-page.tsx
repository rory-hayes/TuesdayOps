import { Beaker, Play } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { seedData } from "@/lib/data/seed";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function ChecksPage() {
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
        <Button size="sm">
          <Play size={15} aria-hidden="true" />
          Run selected
        </Button>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Enabled checks</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scheduled monitors attached to workflows.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {seedData.checks.map((check) => {
              const workflow = seedData.workflows.find((candidate) => candidate.id === check.workflowId);

              return (
                <div key={check.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{workflow?.name}</p>
                    </div>
                    <StatusBadge status={check.latestStatus} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="muted">{check.type}</Badge>
                    <Badge variant="muted">{check.schedule}</Badge>
                    <Badge variant="muted">{check.assertionCount} assertions</Badge>
                  </div>
                </div>
              );
            })}
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
            {seedData.testPacks.map((pack) => {
              const workflow = seedData.workflows.find((candidate) => candidate.id === pack.workflowId);

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
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
