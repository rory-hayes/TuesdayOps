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
  const accessibleLabel = getChartAccessibleLabel(label, points, suffix);

  return (
    <figure className={cn("rounded-lg border border-border p-3", className)}>
      <figcaption className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          Latest {points.at(-1)?.value ?? 0}{suffix}
        </span>
      </figcaption>
      {points.length ? (
        <div className={cn("relative", plotClassName)}>
          <svg
            role="img"
            aria-label={accessibleLabel}
            viewBox="0 0 240 80"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            <path d={path.area} fill="rgba(24,24,27,0.08)" />
            <path d={path.line} fill="none" stroke="rgb(39,39,42)" strokeWidth="2" strokeLinecap="round" />
            {path.points.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="rgb(39,39,42)"
              >
                <title>{getTooltipLabel(points[index], suffix)}</title>
              </circle>
            ))}
          </svg>
          {path.points.map((point, index) => {
            const tooltip = getTooltipLabel(points[index], suffix);

            return (
              <button
                key={`${points[index].label}-${point.x}-${point.y}`}
                type="button"
                aria-label={tooltip}
                title={tooltip}
                className="group absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                style={{
                  left: `${(point.x / path.width) * 100}%`,
                  top: `${(point.y / path.height) * 100}%`,
                }}
              >
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-transparent transition group-hover:ring-primary/15 group-focus-visible:ring-primary/20" />
                <span
                  className={cn(
                    "pointer-events-none absolute z-10 hidden min-w-max rounded-md border border-zinc-950/10 bg-zinc-950 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block",
                    point.y < 22 ? "top-full mt-2" : "bottom-full mb-2",
                    index === 0 ? "left-0" : index === path.points.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  {tooltip}
                </span>
              </button>
            );
          })}
        </div>
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
  const accessibleLabel = getChartAccessibleLabel(label, points);

  return (
    <figure className="rounded-lg border border-border p-3">
      <figcaption className="text-sm font-medium">{label}</figcaption>
      <div className="mt-3 grid gap-2" role="img" aria-label={accessibleLabel}>
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

  return { line, area, points: coordinates, width, height };
}

function getTooltipLabel(point: ChartPoint | undefined, suffix: string) {
  if (!point) {
    return `No data${suffix}`;
  }

  return `${point.label}: ${point.value}${suffix}`;
}

function getChartAccessibleLabel(label: string, points: ChartPoint[], suffix = "") {
  if (!points.length) {
    return `${label} chart. No data yet.`;
  }

  const values = points.map((point) => getTooltipLabel(point, suffix)).join(". ");
  const latest = points.at(-1)?.value ?? 0;

  return `${label} chart. ${values}. Latest ${latest}${suffix}.`;
}
