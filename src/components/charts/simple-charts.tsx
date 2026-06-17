import type { ChartPoint } from "@/lib/dashboard/charts";
import { cn } from "@/lib/utils";

export function MiniLineChart({
  label,
  points,
  suffix = "",
  className,
  chartClassName,
}: {
  label: string;
  points: ChartPoint[];
  suffix?: string;
  className?: string;
  chartClassName?: string;
}) {
  const path = buildLinePath(points);
  const plotClassName = cn("mt-3 h-24 w-full", chartClassName);

  return (
    <figure className={cn("rounded-lg border border-border p-3", className)}>
      <figcaption className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{points.at(-1)?.value ?? 0}{suffix}</span>
      </figcaption>
      {points.length ? (
        <svg role="img" aria-label={label} viewBox="0 0 240 80" className={plotClassName}>
          <path d={path.area} fill="rgba(124,108,242,0.12)" />
          <path d={path.line} fill="none" stroke="rgb(124,108,242)" strokeWidth="3" strokeLinecap="round" />
          {path.points.map((point) => (
            <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3" fill="rgb(124,108,242)" />
          ))}
        </svg>
      ) : (
        <p className={cn("mt-3 flex h-24 items-center rounded-md bg-muted p-3 text-xs text-muted-foreground", chartClassName)}>
          No chart data yet.
        </p>
      )}
    </figure>
  );
}

export function MiniBarChart({
  label,
  points,
  tone = "primary",
}: {
  label: string;
  points: ChartPoint[];
  tone?: "primary" | "risk";
}) {
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <figure className="rounded-lg border border-border p-3">
      <figcaption className="text-sm font-medium">{label}</figcaption>
      <div className="mt-3 grid gap-2">
        {points.map((point) => (
          <div key={point.label} className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-2 text-xs">
            <span className="truncate text-muted-foreground">{point.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", tone === "risk" ? "bg-danger" : "bg-primary")}
                style={{ width: `${Math.round((point.value / max) * 100)}%` }}
              />
            </span>
            <span className="text-right font-medium">{point.value}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function buildLinePath(points: ChartPoint[]) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 240;
  const height = 80;
  const padding = 8;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => ({
    x: padding + index * step,
    y: height - padding - (point.value / max) * (height - padding * 2),
  }));
  const line = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = coordinates.length
    ? `${line} L ${coordinates.at(-1)?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`
    : "";

  return { line, area, points: coordinates };
}
