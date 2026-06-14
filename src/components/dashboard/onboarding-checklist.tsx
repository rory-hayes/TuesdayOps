import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { buildOnboardingProgress } from "@/lib/onboarding/progress";
import type { TuesdayOpsSeedData } from "@/lib/domain/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type OnboardingChecklistProps = {
  data: TuesdayOpsSeedData;
};

export function OnboardingChecklist({ data }: OnboardingChecklistProps) {
  const progress = buildOnboardingProgress(data);

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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
