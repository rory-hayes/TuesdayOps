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
  PlayIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/20/solid";
import { BrandLogo } from "@/components/brand-logo";
import { PUBLIC_BILLING_PLANS } from "@/lib/billing/plans";
import { getLandingContent } from "@/lib/marketing/landing";

const workflowRows = [
  {
    workflow: "Lead intake agent",
    client: "Northstar Studio",
    status: "Healthy",
    passRate: "99%",
    tone: "success",
  },
  {
    workflow: "Support triage",
    client: "Oak & Field",
    status: "Review",
    passRate: "86%",
    tone: "warning",
  },
  {
    workflow: "Proposal assistant",
    client: "Brightline Labs",
    status: "Healthy",
    passRate: "96%",
    tone: "success",
  },
];

const issueRows = [
  { label: "Expired API key", detail: "Webhook check failed twice", severity: "High" },
  { label: "Schema drift", detail: "Missing lead.intent field", severity: "Medium" },
];

const metrics = [
  { label: "Workflow pass rate", value: "96%", note: "+4 pts" },
  { label: "Open issues", value: "3", note: "1 high" },
  { label: "Report drafts", value: "8", note: "ready" },
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
    title: "Monitor the workflows clients rely on",
    description: "Endpoint checks, scheduled runs, and external run logs stay attached to the client and workflow that produced them.",
  },
  {
    title: "Move failures into accountable work",
    description: "Failures create deduped issues with severity, owner, status, maintenance notes, and report-safe resolution copy.",
  },
  {
    title: "Send proof from stored evidence",
    description: "Monthly reports are built from check runs, issues, synthetic tests, and prompt or model change records.",
  },
];

const agencySignals = [
  {
    value: "200+",
    label: "customers supported",
    description: "Agency client accounts that need workflow maintenance, issue follow-up, and monthly proof.",
  },
  {
    value: "2,500+",
    label: "active workflows monitored",
    description: "Production automations, agents, and endpoints watched for failures, latency, and regressions.",
  },
  {
    value: "15k+",
    label: "report-ready checks run",
    description: "Stored health signals that turn routine monitoring into client-ready maintenance evidence.",
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
    <main className="min-h-screen bg-[#f8f8f7] text-zinc-950">
      <a
        href="#content"
        className="sr-only fixed left-3 top-3 z-50 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950 shadow ring-2 ring-zinc-950/20 focus:not-sr-only"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-zinc-950/10 bg-[#f8f8f7]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Tuesday home" className="shrink-0">
            <BrandLogo />
          </Link>
          <nav aria-label="Public navigation" className="hidden items-center gap-7 md:flex">
            <HeaderAnchor href="#product">Product</HeaderAnchor>
            <HeaderAnchor href="#reports">Reports</HeaderAnchor>
            <HeaderAnchor href="#loop">How it works</HeaderAnchor>
            <HeaderAnchor href="#pricing">Pricing</HeaderAnchor>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              prefetch={false}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm/6 font-semibold text-zinc-700 transition-colors hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              prefetch={false}
              className="inline-flex h-9 items-center rounded-md bg-zinc-950 px-3.5 text-sm/6 font-semibold !text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            >
              <span className="hidden sm:inline">Start monitoring</span>
              <span className="sm:hidden">Start</span>
            </Link>
          </div>
        </div>
      </header>

      <section
        id="content"
        className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-10 pt-10 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(30rem,1.14fr)] lg:items-center lg:pb-10 lg:pt-10"
      >
        <div className="max-w-2xl">
          <h1 className="text-5xl/13 font-semibold tracking-normal text-zinc-950 sm:text-6xl/16">
            {content.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/12">
            Keep client AI workflows healthy after launch.
          </p>
          <p className="mt-5 max-w-xl text-base/7 text-zinc-600 sm:text-lg/8">
            {content.hero.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              prefetch={false}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm/6 font-semibold !text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            >
              Start monitoring
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="#loop"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-950/10 bg-white px-4 text-sm/6 font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
            >
              See how it works
              <PlayIcon className="size-4 text-zinc-500" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid max-w-2xl gap-4 border-t border-zinc-950/10 pt-5 sm:grid-cols-3">
            <ProofMetric value="Built for" label="agencies, not internal AI engineering teams" />
            <ProofMetric value="Client-ready" label="reports from operational evidence" />
            <ProofMetric value="Tenant-safe" label="workspaces and workflow credentials" />
          </div>
        </div>

        <ProductScene />
      </section>

      <section aria-labelledby="agency-signal-heading" className="border-y border-zinc-950/10 bg-zinc-950 px-5 py-12 text-white sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
          <div>
            <h2 id="agency-signal-heading" className="text-2xl/8 font-semibold tracking-normal sm:text-3xl/10">
              Agency teams are moving from launches to retained operations.
            </h2>
            <p className="mt-3 max-w-xl text-sm/6 text-zinc-300">
              Tuesday is built for the point where client AI workflows are no longer experiments; they are production systems someone has to monitor, fix, and explain.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
            {agencySignals.map((signal) => (
              <article key={signal.label} className="bg-zinc-950 p-5">
                <p className="text-3xl/9 font-semibold tracking-normal text-white">{signal.value}</p>
                <h3 className="mt-2 text-sm/6 font-semibold text-zinc-100">{signal.label}</h3>
                <p className="mt-2 text-sm/6 text-zinc-400">{signal.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="reports" className="bg-zinc-950 px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl/10 font-semibold tracking-normal sm:text-4xl/11">
              Send reports your clients actually understand
            </h2>
            <p className="mt-4 text-base/7 text-zinc-300">
              Show workflows monitored, issues caught, fixes completed, and recommendations for next month.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                prefetch={false}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm/6 font-semibold !text-zinc-950 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Create account
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#loop"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 px-4 text-sm/6 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                See workflow
              </Link>
            </div>
          </div>

          <ReportPreview />
        </div>
      </section>

      <section id="product" className="border-y border-zinc-950/10 bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="max-w-xl">
            <h2 className="text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/11">
              Built for agencies that maintain client AI workflows — not internal AI engineering teams.
            </h2>
            <p className="mt-4 text-base/7 text-zinc-600">
              Tuesday gives agencies one calm operating record for workflow health, maintenance issues, and the monthly updates clients actually understand.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-zinc-950/10 bg-zinc-950/10 md:grid-cols-3">
            {proofPoints.map((point, index) => (
              <article key={point.title} className="bg-white p-6">
                <p className="text-xs/5 font-semibold uppercase text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-5 text-base/7 font-semibold text-zinc-950">{point.title}</h3>
                <p className="mt-2 text-sm/6 text-zinc-600">{point.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="loop" className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.78fr_1fr] lg:items-end">
            <div>
              <h2 className="text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/11">
                {content.sections[0].title}
              </h2>
              <p className="mt-4 max-w-xl text-base/7 text-zinc-600">{content.sections[0].description}</p>
            </div>
            <p className="max-w-2xl text-sm/6 text-zinc-500 lg:justify-self-end">
              Every screen supports the same operational path: connect workflow endpoints, run checks, create issues, resolve maintenance work, and send proof reports from stored source data.
            </p>
          </div>

          <ol className="mt-12 grid gap-0 overflow-hidden rounded-lg border border-zinc-950/10 bg-white md:grid-cols-3 xl:grid-cols-5">
            {content.sections[0].items.map((item, index) => {
              const Icon = loopIcons[index] ?? CheckCircleIcon;

              return (
                <li
                  key={item.label}
                  className="relative border-b border-zinc-950/10 p-5 md:border-r md:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:last:border-r-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-full border border-zinc-950/10 bg-zinc-50 text-zinc-700">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs/5 font-medium text-zinc-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-sm/6 font-semibold text-zinc-950">{item.label}</h3>
                  <p className="mt-2 text-sm/6 text-zinc-600">{item.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="pricing" className="border-y border-zinc-950/10 bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl/10 font-semibold tracking-normal text-zinc-950 sm:text-4xl/11">
                Pricing by client capacity, not by seats.
              </h2>
            </div>
            <p className="max-w-xl text-sm/6 text-zinc-500">
              Keep the whole delivery team in the workflow while the plan scales with the client and automation volume you maintain.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {PUBLIC_BILLING_PLANS.map((plan) => (
              <article
                key={plan.key}
                className={[
                  "relative flex min-h-[22rem] flex-col rounded-lg border p-5 shadow-[var(--shadow-soft)]",
                  plan.featured
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-950/10 bg-[#f8f8f7] text-zinc-950",
                ].join(" ")}
              >
                {plan.featured ? (
                  <span className="absolute right-4 top-4 text-xs/5 font-semibold uppercase text-zinc-400">
                    Recommended
                  </span>
                ) : null}
                <h3 className="text-lg/7 font-semibold">{plan.name}</h3>
                <p className={["mt-2 text-sm/6", plan.featured ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                  {plan.purpose}
                </p>
                <div className="mt-6 flex items-end gap-1">
                  <p className="text-4xl/10 font-semibold tracking-normal">{plan.priceLabel}</p>
                  <p className={["pb-1 text-sm/6", plan.featured ? "text-zinc-300" : "text-zinc-500"].join(" ")}>
                    {plan.cadence}
                  </p>
                </div>
                <div
                  className={[
                    "mt-6 border-t pt-4 text-sm/6",
                    plan.featured ? "border-white/15 text-zinc-200" : "border-zinc-950/10 text-zinc-700",
                  ].join(" ")}
                >
                  {plan.limitLabel}
                </div>
                <Link
                  href="/sign-up"
                  prefetch={false}
                  className={[
                    "mt-auto inline-flex h-10 items-center justify-center rounded-md px-3 text-sm/6 font-semibold transition focus:outline-none focus:ring-2",
                    plan.featured
                      ? "bg-white !text-zinc-950 hover:bg-zinc-100 focus:ring-white/50"
                      : "bg-zinc-950 !text-white hover:bg-zinc-800 focus:ring-zinc-950/20",
                  ].join(" ")}
                >
                  Start with {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 border-b border-zinc-950/10 pb-14 md:grid-cols-3">
          {content.sections[1].items.map((item, index) => (
            <article key={item.label} className="flex gap-4">
              <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-zinc-950/10 bg-white text-zinc-700">
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

function ProofMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm/6 font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-sm/6 text-zinc-500">{label}</p>
    </div>
  );
}

function ProductScene() {
  return (
    <section
      aria-label="Tuesday product preview"
      className="overflow-hidden rounded-lg border border-zinc-950/10 bg-white shadow-[0_28px_90px_rgb(24_24_27_/_12%)]"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-950/10 px-4 py-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm/6 font-semibold text-zinc-950">Northstar Studio</p>
          <p className="text-xs/5 text-zinc-500">June workflow maintenance record</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-950/10 bg-zinc-50 px-2.5 py-1 text-xs/5 font-semibold text-zinc-700">
          <DocumentChartBarIcon className="size-4 text-zinc-500" aria-hidden="true" />
          Report draft ready
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.72fr_0.88fr]">
        <div className="min-w-0 border-b border-zinc-950/10 lg:border-b-0 lg:border-r">
          <dl className="grid grid-cols-3 border-b border-zinc-950/10">
            {metrics.map((metric) => (
              <div key={metric.label} className="border-r border-zinc-950/10 p-4 last:border-r-0">
                <dt className="text-xs/5 text-zinc-500">{metric.label}</dt>
                <dd className="mt-1 flex flex-wrap items-end gap-2">
                  <span className="text-2xl/8 font-semibold text-zinc-950">{metric.value}</span>
                  <span className={metric.note === "1 high" ? "pb-1 text-xs/5 font-medium text-amber-700" : "pb-1 text-xs/5 font-medium text-lime-700"}>
                    {metric.note}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_3.75rem] gap-2 border-b border-zinc-950/10 bg-zinc-50 px-3 py-2 text-xs/5 font-medium uppercase text-zinc-500 sm:grid-cols-[minmax(0,1fr)_5.75rem_4.75rem] sm:gap-3 sm:px-4">
                <span>Workflow</span>
                <span>Status</span>
                <span>Pass</span>
              </div>
              {workflowRows.map((row) => (
                <div
                  key={row.workflow}
                  className="grid grid-cols-[minmax(0,1fr)_4.75rem_3.75rem] gap-2 border-b border-zinc-950/10 px-3 py-2.5 text-sm/6 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_5.75rem_4.75rem] sm:gap-3 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-950">{row.workflow}</p>
                    <p className="truncate text-xs/5 text-zinc-500">{row.client}</p>
                  </div>
                  <span className={statusClass(row.tone)}>{row.status}</span>
                  <span className="font-medium text-zinc-950">{row.passRate}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm/6 font-semibold text-zinc-950">Pass-rate trend</p>
              <p className="text-xs/5 text-zinc-500">Last 30 days</p>
            </div>
            <div className="mt-3 grid h-24 grid-cols-12 items-end gap-2 border-b border-l border-zinc-950/10 px-2 pb-2">
              {[58, 69, 66, 74, 71, 82, 78, 86, 84, 90, 92, 96].map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="rounded-t-sm bg-zinc-800"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="grid content-start">
          <div className="border-b border-zinc-950/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm/6 font-semibold text-zinc-950">Open issues</p>
              <span className="text-xs/5 text-zinc-500">3 active</span>
            </div>
            <div className="mt-3 divide-y divide-zinc-950/10 border-y border-zinc-950/10">
              {issueRows.map((issue) => (
                <div key={issue.label} className="py-3">
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

          <div className="p-4">
            <div className="flex items-center gap-2">
              <DocumentChartBarIcon className="size-4 text-zinc-500" aria-hidden="true" />
              <p className="text-sm/6 font-semibold text-zinc-950">Client report</p>
            </div>
            <p className="mt-2 text-xs/5 text-zinc-500">
              Generated from stored check runs, resolved issues, and synthetic test results.
            </p>
            <div className="mt-3 grid gap-2">
              {reportItems.slice(0, 3).map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs/5 text-zinc-600">
                  <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-lime-700" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
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

      <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-950/10 bg-zinc-950/10 sm:grid-cols-2">
        <div className="bg-[#f8f8f7] p-4">
          <p className="text-xs/5 text-zinc-500">Checks run</p>
          <p className="mt-1 text-3xl/9 font-semibold">42</p>
        </div>
        <div className="bg-[#f8f8f7] p-4">
          <p className="text-xs/5 text-zinc-500">Resolved issues</p>
          <p className="mt-1 text-3xl/9 font-semibold">2</p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-zinc-950/10 border-y border-zinc-950/10">
        {reportItems.map((item) => (
          <div key={item} className="flex items-start gap-3 py-3">
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
