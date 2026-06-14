import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/16/solid";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getOpenIssues } from "@/lib/domain/summaries";
import type { Client, TuesdayOpsSeedData } from "@/lib/domain/types";
import { formatPercentage, formatRelativeTime } from "@/lib/formatting";

export function ClientDetailPage({
  data,
  client,
}: {
  data: TuesdayOpsSeedData;
  client: Client;
}) {
  const workflows = data.workflows.filter((workflow) => workflow.clientId === client.id);
  const openIssues = getOpenIssues(data).filter((issue) => issue.clientId === client.id);
  const reports = data.reports.filter((report) => report.clientId === client.id);

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-5">
        <Link href="/clients" className="inline-flex items-center gap-2 text-sm/6 font-medium text-zinc-500 hover:text-zinc-950">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Clients
        </Link>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl/8 font-semibold text-zinc-950 md:text-3xl/9">{client.name}</h1>
            <p className="mt-2 max-w-2xl text-sm/6 text-zinc-500">
              {client.industry} client workspace with {workflows.length} monitored workflows.
            </p>
          </div>
          <Link
            href="/workflows"
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-950/10 bg-white px-3.5 text-sm/6 font-semibold text-zinc-950 shadow-sm hover:bg-zinc-50"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Add workflow
          </Link>
        </div>
      </div>

      <section className="grid gap-8 md:grid-cols-3">
        <ClientStat label="Health" value={`${client.healthScore}%`} detail="Average workflow pass rate" />
        <ClientStat label="Workflows" value={workflows.length.toString()} detail="Included maintenance surface" />
        <ClientStat label="Open issues" value={openIssues.length.toString()} detail="Needs review before report" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <h2 className="text-base/7 font-semibold text-zinc-950">Workflows</h2>
            <p className="mt-1 text-sm/6 text-zinc-500">Health and recent checks for this client.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm/6">
              <thead className="text-zinc-500">
                <tr className="border-b border-zinc-950/10">
                  <th className="px-5 py-3 font-medium">Workflow</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Pass</th>
                  <th className="px-5 py-3 font-medium">Last check</th>
                </tr>
              </thead>
              <tbody>
                {workflows.length ? (
                  workflows.map((workflow) => (
                    <tr key={workflow.id} className="group border-b border-zinc-950/5 transition-colors hover:bg-zinc-50 last:border-0">
                      <td className="px-5 py-4">
                        <Link href={`/workflows/${workflow.id}`} className="font-medium text-zinc-950 group-hover:text-primary group-hover:underline">
                          {workflow.name}
                        </Link>
                        <p className="mt-1 max-w-[24rem] truncate text-xs/5 text-zinc-500">
                          {workflow.endpointUrl}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="muted">{workflow.type.replaceAll("_", " ")}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-5 py-4">{formatPercentage(workflow.passRate)}</td>
                      <td className="px-5 py-4 text-zinc-500">{formatRelativeTime(workflow.lastCheckAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-10 text-sm/6 text-zinc-500" colSpan={5}>
                      Add the first workflow for this client from the Workflows screen.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <h2 className="text-base/7 font-semibold text-zinc-950">Report status</h2>
            </CardHeader>
            <CardContent>
              {client.reportStatus === "not_started" ? (
                <Badge variant="muted">not started</Badge>
              ) : (
                <StatusBadge status={client.reportStatus === "ready" ? "ready_to_send" : client.reportStatus} />
              )}
              <p className="mt-4 text-sm/6 text-zinc-500">
                Reports are generated from stored workflow checks, issues, and synthetic test runs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base/7 font-semibold text-zinc-950">Recent reports</h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {reports.length ? (
                reports.slice(0, 3).map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block rounded-lg border border-zinc-950/10 p-3 transition-colors hover:border-primary/40 hover:bg-zinc-50"
                  >
                    <p className="text-sm/6 font-medium text-zinc-950">{report.periodLabel}</p>
                    <p className="mt-1 text-xs/5 text-zinc-500">
                      {report.checksRun} checks, {formatPercentage(report.passRate)} pass rate
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm/6 text-zinc-500">No reports generated yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ClientStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-t border-zinc-950/10 pt-6">
      <p className="text-sm/6 text-zinc-600">{label}</p>
      <p className="mt-2 text-3xl/9 font-semibold tracking-tight text-zinc-950">{value}</p>
      <p className="mt-1 text-sm/6 text-zinc-500">{detail}</p>
    </div>
  );
}
