import Link from "next/link";
import { CheckCircle2, Circle, Database, PlayCircle } from "lucide-react";
import { seedSampleDataAction } from "@/lib/sample-data/service";
import { buildOnboardingProgress } from "@/lib/onboarding/progress";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type OnboardingChecklistProps = {
  data: TuesdayOpsSeedData;
  notice?: string;
  error?: string;
};

export function OnboardingChecklist({ data, notice, error }: OnboardingChecklistProps) {
  const progress = buildOnboardingProgress(data);
  const sampleDataSeeded = Boolean(data.agency.sampleDataSeededAt);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Activation path</p>
          <h3 className="mt-1 text-lg font-semibold">Reach your first workflow proof</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Complete the setup loop agencies need before a client maintenance review.
          </p>
        </div>
        <div className="min-w-[180px]">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{progress.completedCount} of {progress.totalCount}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 md:grid-cols-5">
          {progress.steps.map((step) => {
            const Icon = step.complete ? CheckCircle2 : Circle;

            return (
              <Link
                key={step.id}
                href={step.href}
                className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={17}
                    aria-hidden="true"
                    className={step.complete ? "text-success" : "text-muted-foreground"}
                  />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
              </Link>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Database size={17} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">Demo data</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Seed a client, workflow, check runs, issue, test pack, and report.
              </p>
            </div>
          </div>

          {notice ? <p className="mt-3 rounded-md bg-success-background p-2 text-xs text-success">{notice}</p> : null}
          {error ? <p className="mt-3 rounded-md bg-danger-background p-2 text-xs text-danger">{error}</p> : null}

          <form action={seedSampleDataAction} className="mt-4">
            <Button type="submit" size="sm" variant={sampleDataSeeded ? "secondary" : "primary"} disabled={sampleDataSeeded}>
              <PlayCircle size={15} aria-hidden="true" />
              {sampleDataSeeded ? "Demo seeded" : "Seed demo data"}
            </Button>
          </form>

          {progress.nextStep ? (
            <Link
              href={progress.nextStep.href}
              className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
            >
              Continue: {progress.nextStep.label}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
