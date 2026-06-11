import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  trend?: string;
  icon?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, detail, trend, icon, className }: MetricCardProps) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardContent className="flex min-h-32 flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon ? <div className="text-primary">{icon}</div> : null}
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-normal text-foreground">{value}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{detail}</span>
            {trend ? <span className="font-medium text-success">{trend}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
