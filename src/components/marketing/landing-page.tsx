import Link from "next/link";
import {
  ArrowRightIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/20/solid";
import { BrandLogo } from "@/components/brand-logo";
import { getLandingContent } from "@/lib/marketing/landing";

const workflowRows = [
  {
    workflow: "Lead intake agent",
    client: "Northstar Studio",
    status: "Healthy",
    passRate: "99%",
    latency: "412ms",
    tone: "success",
  },
  {
    workflow: "Support triage",
    client: "Oak & Field",
    status: "Review",
    passRate: "86%",
    latency: "1.4s",
    tone: "warning",
  },
  {
    workflow: "Proposal assistant",
    client: "Brightline Labs",
    status: "Healthy",
    passRate: "96%",
    latency: "533ms",
    tone: "success",
  },
];

const issueRows = [
  { label: "Expired API key", detail: "Webhook check failed twice", severity: "High" },
  { label: "Schema drift", detail: "Missing lead.intent field", severity: "Medium" },
];

const metrics = [
  { label: "workflow pass rate", value: "96%" },
  { label: "open issues", value: "3" },
  { label: "report drafts", value: "8" },
];

const loopIcons = [
  Squares2X2Icon,
  KeyIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentChartBarIcon,
];

const proofPoints = [
  {
    title: "Catch failures before clients do",
    description: "Scheduled checks and run logs surface broken endpoints, slow responses, and degraded workflow behavior.",
  },
  {
    title: "Turn failures into maintenance work",
    description: "Failed checks create deduped issues with severity, owner, status, and report-safe resolution notes.",
  },
  {
    title: "Report from stored evidence",
    description: "Monthly reports are generated from check runs, issues, synthetic tests, and model or prompt changes.",
  },
];

const reportItems = [
  "42 workflow checks monitored",
  "3 issues caught before client escalation",
  "2 resolved incidents added to the proof log",
  "Prompt v7 passed change validation",
];

export function MarketingLandingPage() {
  const content = getLandingContent();

  return (
    <main className="min-h-screen bg-[#fbfafc] text-zinc-950">
      <a
        href="#content"
        className="sr-only fixed left-3 top-3 z-50 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950 shadow ring-2 ring-zinc-950/20 focus:not-sr-only"
      >
        Skip to content
      </a>

      <header className="relative z-30 border-b border-zinc-950/10 bg-[#fbfafc]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="TuesdayOps home">
            <BrandLogo />
          </Link>
          <nav aria-label="Public navigation" className="hidden items-center gap-6 md:flex">
            <HeaderAnchor href="#product">Product</HeaderAnchor>
            <HeaderAnchor href="#loop">Proof loop</HeaderAnchor>
            <HeaderAnchor href="#reports">Reports</HeaderAnchor>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              prefetch={false}
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm/6 font-semibold text-zinc-700 transition-colors hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              prefetch={false}
              className="inline-flex h-9 items-center rounded-lg bg-zinc-950 px-3.5 text-sm/6 font-semibold !text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            >
              Start
            </Link>
          </div>
        </div>
      </header>

      <section
        id="content"
        className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 pb-14 pt-10 sm:px-8 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[minmax(0,0.88fr)_minmax(30rem,1.12fr)] lg:items-center lg:pb-16 lg:pt-12"
      >
        <div className="landing-rise max-w-2xl">
          <h1 className="text-5xl/12 font-semibold tracking-normal text-zinc-950 sm:text-7xl/18">
            {content.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/11">
            Keep client AI workflows healthy after launch.
          </p>
          <p className="mt-5 max-w-xl text-base/7 text-zinc-600 sm:text-lg/8">
            {content.hero.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              prefetch={false}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm/6 font-semibold !text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            >
              Start monitoring
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="#product"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-950/10 bg-white px-4 text-sm/6 font-semibold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
            >
              See the product
            </Link>
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-zinc-950/10 pt-5">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <p className="text-2xl/8 font-semibold text-zinc-950">{metric.value}</p>
                <p className="mt-1 text-xs/5 text-zinc-500">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductScene />
      </section>

      <section id="product" className="border-y border-zinc-950/10 bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-sm/6 font-semibold text-[#6f5f99]">Built for retained delivery teams</p>
            <h2 className="mt-3 text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/11">
              Post-launch monitoring that ends in client proof.
            </h2>
            <p className="mt-4 text-base/7 text-zinc-600">
              TuesdayOps gives agencies one calm place to track workflow health, resolve operational issues, and prepare the monthly update clients actually understand.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {proofPoints.map((point, index) => (
              <article key={point.title} className="rounded-lg border border-zinc-950/10 bg-[#fbfafc] p-5 shadow-[var(--shadow-soft)]">
                <span className="grid size-9 place-items-center rounded-lg bg-[#f1eef9] text-[#6f5f99]">
                  {index === 0 ? (
                    <ShieldCheckIcon className="size-5" aria-hidden="true" />
                  ) : index === 1 ? (
                    <ExclamationTriangleIcon className="size-5" aria-hidden="true" />
                  ) : (
                    <DocumentChartBarIcon className="size-5" aria-hidden="true" />
                  )}
                </span>
                <h3 className="mt-5 text-base/7 font-semibold text-zinc-950">{point.title}</h3>
                <p className="mt-2 text-sm/6 text-zinc-600">{point.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="loop" className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-end">
            <div>
              <h2 className="text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/11">
                {content.sections[0].title}
              </h2>
              <p className="mt-4 max-w-xl text-base/7 text-zinc-600">{content.sections[0].description}</p>
            </div>
            <p className="max-w-2xl text-sm/6 text-zinc-500 lg:justify-self-end">
              Every screen supports the same operational path: add the client, register the workflow, run checks, resolve issues, and generate proof from stored source data.
            </p>
          </div>

          <ol className="mt-10 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {content.sections[0].items.map((item, index) => {
              const Icon = loopIcons[index] ?? CheckCircleIcon;

              return (
                <li key={item.label} className="group rounded-lg border border-zinc-950/10 bg-white p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[#b7aad8]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-8 place-items-center rounded-lg bg-[#f1eef9] text-[#6f5f99]">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs/5 font-medium text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-5 text-sm/6 font-semibold text-zinc-950">{item.label}</h3>
                  <p className="mt-2 text-sm/6 text-zinc-600">{item.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="reports" className="bg-zinc-950 px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl/10 font-semibold tracking-normal sm:text-4xl/11">
              Monthly reports without a last-minute evidence hunt.
            </h2>
            <p className="mt-4 text-base/7 text-zinc-300">
              Reports pull from the operational record your team already created: checks, issues, resolutions, test runs, and workflow change notes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                prefetch={false}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm/6 font-semibold !text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Create account
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/sign-in"
                prefetch={false}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 px-4 text-sm/6 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Sign in
              </Link>
            </div>
          </div>

          <ReportPreview />
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 border-b border-zinc-950/10 pb-14 md:grid-cols-3">
          {content.sections[1].items.map((item, index) => (
            <article key={item.label} className="flex gap-4">
              <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-[#f1eef9] text-[#6f5f99]">
                {index === 0 ? (
                  <KeyIcon className="size-4" aria-hidden="true" />
                ) : index === 1 ? (
                  <DocumentChartBarIcon className="size-4" aria-hidden="true" />
                ) : (
                  <ChartBarSquareIcon className="size-4" aria-hidden="true" />
                )}
              </span>
              <div>
                <h2 className="text-base/7 font-semibold text-zinc-950">{item.label}</h2>
                <p className="mt-1 text-sm/6 text-zinc-600">{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 pt-8 md:flex-row md:items-center">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-xl text-sm/6 text-zinc-500">
              Focused SaaS for agencies maintaining live AI workflows after launch.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm/6 text-zinc-500">
            <LockClosedIcon className="size-4" aria-hidden="true" />
            Tenant-scoped data, encrypted workflow auth, report-safe summaries.
          </div>
        </div>
      </section>
    </main>
  );
}

function HeaderAnchor({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="text-sm/6 font-medium text-zinc-600 transition-colors hover:text-zinc-950">
      {children}
    </Link>
  );
}

function ProductScene() {
  return (
    <section
      aria-label="TuesdayOps product preview"
      className="landing-rise landing-delay-1 overflow-hidden rounded-lg border border-zinc-950/10 bg-white shadow-[0_24px_80px_rgb(24_24_27_/_12%)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-zinc-950/10 px-4 py-3">
        <div>
          <p className="text-sm/6 font-semibold text-zinc-950">Agency operations</p>
          <p className="text-xs/5 text-zinc-500">June client workflow health</p>
        </div>
        <span className="rounded-md bg-[#f1eef9] px-2.5 py-1 text-xs/5 font-semibold text-[#6f5f99]">
          Report draft ready
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 border-b border-zinc-950/10 p-4 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg bg-[#fbfafc] p-3 ring-1 ring-zinc-950/5">
                <p className="text-xs/5 text-zinc-500">{metric.label}</p>
                <p className="mt-1 text-xl/7 font-semibold text-zinc-950">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-950/10">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] bg-zinc-50 px-3 py-2 text-xs/5 font-medium uppercase text-zinc-500">
              <span>Workflow</span>
              <span>Status</span>
              <span>Pass</span>
            </div>
            {workflowRows.map((row) => (
              <div key={row.workflow} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-3 border-t border-zinc-950/10 px-3 py-3 text-sm/6">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-950">{row.workflow}</p>
                  <p className="truncate text-xs/5 text-zinc-500">{row.client}</p>
                </div>
                <span className={statusClass(row.tone)}>{row.status}</span>
                <span className="font-medium text-zinc-950">{row.passRate}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-zinc-950 p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm/6 font-semibold">Pass-rate trend</p>
              <p className="text-xs/5 text-zinc-400">Last 30 days</p>
            </div>
            <div className="mt-4 flex h-24 items-end gap-2">
              {[44, 56, 52, 68, 62, 74, 80, 72, 88, 84, 92, 96].map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="w-full rounded-t-sm bg-[#b7aad8]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm/6 font-semibold text-zinc-950">Open issues</p>
              <span className="text-xs/5 text-zinc-500">3 active</span>
            </div>
            <div className="mt-3 grid gap-2">
              {issueRows.map((issue) => (
                <div key={issue.label} className="rounded-lg bg-[#fbfafc] p-3 ring-1 ring-zinc-950/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm/6 font-semibold text-zinc-950">{issue.label}</p>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs/5 font-semibold text-amber-700">
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs/5 text-zinc-500">{issue.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-950/10 p-3">
            <div className="flex items-center gap-2">
              <DocumentChartBarIcon className="size-4 text-[#6f5f99]" aria-hidden="true" />
              <p className="text-sm/6 font-semibold text-zinc-950">Client report</p>
            </div>
            <p className="mt-2 text-xs/5 text-zinc-500">
              Generated from stored check runs, resolved issues, and synthetic test results.
            </p>
            <div className="mt-3 grid gap-2">
              {reportItems.slice(0, 3).map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs/5 text-zinc-600">
                  <CheckCircleIcon className="size-4 shrink-0 text-lime-700" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportPreview() {
  return (
    <div className="rounded-lg bg-white p-5 text-zinc-950 shadow-[0_20px_70px_rgb(0_0_0_/_24%)]">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-950/10 pb-5">
        <div>
          <p className="text-sm/6 font-semibold text-zinc-950">Monthly proof report</p>
          <p className="mt-1 text-sm/6 text-zinc-500">Brightline Labs - June 2026</p>
        </div>
        <span className="rounded-md bg-lime-50 px-2.5 py-1 text-xs/5 font-semibold text-lime-700">
          Ready
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-[#fbfafc] p-4 ring-1 ring-zinc-950/5">
          <p className="text-xs/5 text-zinc-500">Checks run</p>
          <p className="mt-1 text-3xl/9 font-semibold">42</p>
        </div>
        <div className="rounded-lg bg-[#fbfafc] p-4 ring-1 ring-zinc-950/5">
          <p className="text-xs/5 text-zinc-500">Resolved issues</p>
          <p className="mt-1 text-3xl/9 font-semibold">2</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {reportItems.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-lg border border-zinc-950/10 p-3">
            <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-lime-700" aria-hidden="true" />
            <p className="text-sm/6 text-zinc-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusClass(tone: string): string {
  if (tone === "success") {
    return "inline-flex h-7 w-fit items-center rounded-md bg-lime-50 px-2 text-xs/5 font-semibold text-lime-700";
  }

  return "inline-flex h-7 w-fit items-center rounded-md bg-amber-50 px-2 text-xs/5 font-semibold text-amber-700";
}
