import type { ChartPoint } from "@/lib/dashboard/charts";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type AnimatedBarStyle = CSSProperties & {
  "--bar-target-width": string;
};

export function MiniLineChart({
  label,
  points,
  suffix = "",
  yMax,
  className,
  chartClassName,
  emptyDescription = "Run checks to populate this chart.",
}: {
  label: string;
  points: ChartPoint[];
  suffix?: string;
  yMax?: number;
  className?: string;
  chartClassName?: string;
  emptyDescription?: string;
}) {
  const path = buildLinePath(points, { yMax });
  const plotClassName = cn("relative mx-auto mt-4 aspect-[8/3] w-full max-w-3xl", chartClassName);
  const chartDescription = buildChartDescription(label, points, suffix);

  return (
    <figure className={cn("rounded-lg border border-border p-4", className)}>
      <figcaption className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          Latest {points.at(-1)?.value ?? 0}{suffix}
        </span>
      </figcaption>
      {points.length ? (
        <div className={plotClassName}>
          <svg
            role="img"
            aria-label={chartDescription}
            viewBox={`0 0 ${path.width} ${path.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full overflow-visible"
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = path.padding.top + ratio * (path.height - path.padding.top - path.padding.bottom);

              return (
                <line
                  key={ratio}
                  x1={path.padding.left}
                  x2={path.width - path.padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(9,9,11,0.08)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <path d={path.area} fill="rgba(24,24,27,0.08)" />
            <path
              d={path.line}
              fill="none"
              stroke="rgb(39,39,42)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
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
                <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800 ring-4 ring-white transition group-hover:ring-primary/15 group-focus-visible:ring-primary/20" />
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
        <p className={cn("mx-auto mt-4 flex aspect-[8/3] w-full max-w-3xl items-center rounded-md bg-muted p-3 text-xs/5 text-muted-foreground", chartClassName)}>
          No chart data yet. {emptyDescription}
        </p>
      )}
    </figure>
  );
}

export function MiniBarChart({
  label,
  points,
  tone = "primary",
  emptyDescription = "Run checks to populate this chart.",
}: {
  label: string;
  points: ChartPoint[];
  tone?: "primary" | "risk";
  emptyDescription?: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const chartDescription = buildChartDescription(label, points);

  return (
    <figure className="rounded-lg border border-border p-3">
      <figcaption className="text-sm font-medium">{label}</figcaption>
      {points.length ? (
        <div className="mx-auto mt-3 grid w-full max-w-xl gap-2" role="img" aria-label={chartDescription}>
          {points.map((point, index) => (
            <div key={point.label} className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-2 text-xs">
              <span className="truncate text-muted-foreground">{point.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "block h-full origin-left rounded-full motion-safe:animate-[bar-fill_620ms_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:!transform-none",
                    tone === "risk" ? "bg-danger" : "bg-primary",
                  )}
                  style={buildAnimatedBarStyle({ value: point.value, max, index })}
                />
              </span>
              <span className="text-right font-medium">{point.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mx-auto mt-3 flex h-24 w-full max-w-xl items-center rounded-md bg-muted p-3 text-xs/5 text-muted-foreground">
          No chart data yet. {emptyDescription}
        </p>
      )}
    </figure>
  );
}

export function buildAnimatedBarStyle({
  value,
  max,
  index,
}: {
  value: number;
  max: number;
  index: number;
}): AnimatedBarStyle {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(1, Math.max(0, value) / safeMax);
  const targetWidth = `${Math.round(ratio * 100)}%`;

  return {
    "--bar-target-width": targetWidth,
    animationDelay: `${index * 45}ms`,
    transform: "scaleX(0)",
    width: targetWidth,
  };
}

function buildLinePath(points: ChartPoint[], { yMax }: { yMax?: number } = {}) {
  const max = Math.max(1, yMax ?? 0, ...points.map((point) => point.value));
  const width = 320;
  const height = 120;
  const padding = {
    top: 12,
    right: 10,
    bottom: 16,
    left: 10,
  };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => ({
    x: padding.left + index * step,
    y: padding.top + innerHeight - (Math.min(max, Math.max(0, point.value)) / max) * innerHeight,
  }));
  const line = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = coordinates.length
    ? `${line} L ${coordinates.at(-1)?.x ?? padding.left} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`
    : "";

  return { line, area, points: coordinates, width, height, padding };
}

function getTooltipLabel(point: ChartPoint | undefined, suffix: string) {
  if (!point) {
    return `No data${suffix}`;
  }

  return `${point.label}: ${point.value}${suffix}`;
}

function buildChartDescription(label: string, points: ChartPoint[], suffix = "") {
  const values = points.map((point) => getTooltipLabel(point, suffix)).join(". ");
  const latest = points.at(-1)?.value ?? 0;

  return values
    ? `${label} chart. ${values}. Latest ${latest}${suffix}.`
    : `${label} chart. No data.`;
}
