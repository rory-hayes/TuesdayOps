import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  Squares2X2Icon,
} from "@heroicons/react/20/solid";
import { getLandingContent } from "@/lib/marketing/landing";

const statusRows = [
  { name: "Lead intake QA", client: "Northstar Studio", status: "Passing", tone: "text-lime-700 bg-lime-50" },
  { name: "Support triage", client: "Oak & Field", status: "Review", tone: "text-amber-700 bg-amber-50" },
  { name: "Proposal assistant", client: "Brightline Labs", status: "Passing", tone: "text-lime-700 bg-lime-50" },
];

const metrics = [
  { label: "Pass rate", value: "96%" },
  { label: "Open issues", value: "3" },
  { label: "Ready reports", value: "8" },
];

const sectionIcons = [
  Squares2X2Icon,
  KeyIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
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
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="text-base/6 font-semibold tracking-normal text-zinc-950">
          TuesdayOps
        </Link>
        <nav aria-label="Public navigation" className="flex items-center gap-2">
          <Link
            href="/sign-in"
            prefetch={false}
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm/6 font-semibold text-zinc-700 hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            prefetch={false}
            className="inline-flex h-9 items-center rounded-lg bg-zinc-950 px-3.5 text-sm/6 font-semibold !text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
          >
            Create account
          </Link>
        </nav>
      </header>

      <section
        id="content"
        className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl content-center gap-10 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:items-center"
      >
        <div className="max-w-2xl">
          <p className="text-sm/6 font-semibold text-[#6f5f99]">{content.hero.eyebrow}</p>
          <h1 className="mt-4 text-5xl/14 font-semibold tracking-normal text-zinc-950 sm:text-6xl/16">
            {content.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg/8 text-zinc-600">{content.hero.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
            href="/sign-up"
            prefetch={false}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm/6 font-semibold !text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            >
              Start monitoring
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/sign-in"
              prefetch={false}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-950/10 bg-white px-4 text-sm/6 font-semibold text-zinc-950 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
            >
              Sign in
            </Link>
          </div>
        </div>

        <section
          aria-label="Sample operational summary"
          className="rounded-lg border border-zinc-950/10 bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5"
        >
          <div className="flex flex-col gap-4 border-b border-zinc-950/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm/6 font-semibold text-zinc-950">Agency operations</p>
              <p className="text-sm/6 text-zinc-500">Client workflow health for June</p>
            </div>
            <span className="inline-flex w-fit rounded-md bg-[#f1eef9] px-2.5 py-1 text-xs/5 font-semibold text-[#6f5f99]">
              Report draft ready
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-zinc-950/10 bg-[#fbfafc] p-3">
                <p className="text-xs/5 font-medium text-zinc-500">{metric.label}</p>
                <p className="mt-1 text-2xl/8 font-semibold text-zinc-950">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            {statusRows.map((row) => (
              <div
                key={row.name}
                className="grid gap-2 rounded-lg border border-zinc-950/10 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_6rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm/6 font-semibold text-zinc-950">{row.name}</p>
                  <p className="truncate text-xs/5 text-zinc-500">{row.client}</p>
                </div>
                <p className="text-xs/5 text-zinc-500">Last run 11m ago</p>
                <span className={`inline-flex w-fit rounded-md px-2 py-1 text-xs/5 font-semibold ${row.tone}`}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="border-y border-zinc-950/10 bg-white px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl/8 font-semibold text-zinc-950">{content.sections[0].title}</h2>
            <p className="mt-3 text-sm/6 text-zinc-600">{content.sections[0].description}</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {content.sections[0].items.map((item, index) => {
              const Icon = sectionIcons[index] ?? CheckCircleIcon;

              return (
                <article
                  key={item.label}
                  className="rounded-lg border border-zinc-950/10 bg-[#fbfafc] p-5 shadow-[var(--shadow-soft)]"
                >
                  <Icon className="size-5 text-[#6f5f99]" aria-hidden="true" />
                  <h3 className="mt-4 text-sm/6 font-semibold text-zinc-950">{item.label}</h3>
                  <p className="mt-2 text-sm/6 text-zinc-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-2xl/8 font-semibold text-zinc-950">{content.sections[1].title}</h2>
            <p className="mt-3 text-sm/6 text-zinc-600">{content.sections[1].description}</p>
          </div>
          <div className="grid gap-3">
            {content.sections[1].items.map((item) => (
              <article key={item.label} className="rounded-lg border border-zinc-950/10 bg-white p-5 shadow-[var(--shadow-soft)]">
                <h3 className="text-sm/6 font-semibold text-zinc-950">{item.label}</h3>
                <p className="mt-2 text-sm/6 text-zinc-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
