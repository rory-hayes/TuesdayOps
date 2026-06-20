"use client";

import { useState } from "react";
import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { ReportItem, ReportSummary } from "@/lib/domain/types";
import { formatPercentage } from "@/lib/formatting";
import type { ReportNarrativeEditField } from "@/lib/reports/narrative-edits";

type EditableReportDocumentProps = {
  agencyName: string;
  readOnly?: boolean;
  report: ReportSummary;
  reportItems: ReportItem[];
  updateReportNarrativeAction: (formData: FormData) => void | Promise<void>;
};

export function EditableReportDocument({
  agencyName,
  readOnly = false,
  report,
  reportItems,
  updateReportNarrativeAction,
}: EditableReportDocumentProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const recommendations = report.recommendations.length
    ? report.recommendations
    : ["Generate report source data before sending."];

  return (
    <section className="rounded-xl bg-zinc-100 p-4 ring-1 ring-zinc-950/5 sm:p-6">
      <article
        aria-label="Client report preview"
        className="mx-auto max-w-4xl bg-white p-7 shadow-[0_18px_60px_rgb(24_24_27_/_12%)] ring-1 ring-zinc-950/10 sm:p-9"
      >
        <header className="border-b border-zinc-950/10 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-primary">{agencyName}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950">
                Monthly workflow maintenance report
              </h2>
              <p className="mt-2 text-sm font-medium text-zinc-700">Workflow maintenance proof</p>
              <p className="mt-2 text-sm text-zinc-500">
                Prepared for {report.clientName} - {report.periodLabel}
              </p>
            </div>
            <div className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FileText size={22} aria-hidden="true" />
            </div>
          </div>
        </header>

        <section className="py-6">
          <EditableSectionHeader
            label="Executive summary"
            editLabel="Edit executive summary"
            readOnly={readOnly}
            onEdit={() => setEditingKey("summary")}
          />
          {editingKey === "summary" ? (
            <InlineReportEditForm
              action={updateReportNarrativeAction}
              field="summary"
              reportId={report.id}
              value={report.summary}
              multiline
              onCancel={() => setEditingKey(null)}
            />
          ) : (
            <p className="mt-3 text-sm leading-7 text-zinc-700">{report.summary}</p>
          )}
        </section>

        <section className="grid gap-3 border-y border-zinc-950/10 py-5 sm:grid-cols-4">
          <DocumentMetric label="Workflows" value={report.workflowsMonitored.toString()} />
          <DocumentMetric label="Checks run" value={report.checksRun.toLocaleString("en-IE")} />
          <DocumentMetric label="Pass rate" value={formatPercentage(report.passRate)} />
          <DocumentMetric label="Resolved" value={report.issuesResolved.toString()} />
        </section>

        <section className="grid gap-3 py-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Report modules</p>
          {reportItems.length ? (
            reportItems.map((item) => (
              <ReportItemEditor
                key={item.id}
                action={updateReportNarrativeAction}
                editingKey={editingKey}
                item={item}
                reportId={report.id}
                readOnly={readOnly}
                setEditingKey={setEditingKey}
              />
            ))
          ) : (
            <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
              No report items have been stored for this report.
            </p>
          )}
        </section>

        <section>
          <EditableSectionHeader
            label="Recommendations"
            editLabel="Edit recommendations"
            readOnly={readOnly}
            onEdit={() => setEditingKey("recommendations")}
          />
          {editingKey === "recommendations" ? (
            <InlineReportEditForm
              action={updateReportNarrativeAction}
              field="recommendations"
              reportId={report.id}
              value={report.recommendations.join("\n")}
              multiline
              onCancel={() => setEditingKey(null)}
            />
          ) : (
            <div className="mt-3 grid gap-2">
              {recommendations.map((recommendation) => (
                <p key={recommendation} className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">
                  {recommendation}
                </p>
              ))}
            </div>
          )}
        </section>
      </article>
    </section>
  );
}

function ReportItemEditor({
  action,
  editingKey,
  item,
  reportId,
  readOnly,
  setEditingKey,
}: {
  action: (formData: FormData) => void | Promise<void>;
  editingKey: string | null;
  item: ReportItem;
  reportId: string;
  readOnly: boolean;
  setEditingKey: (key: string | null) => void;
}) {
  const titleKey = `item-title-${item.id}`;
  const bodyKey = `item-body-${item.id}`;

  return (
    <div className="rounded-lg border border-zinc-950/10 px-4 py-3">
      {editingKey === titleKey ? (
        <InlineReportEditForm
          action={action}
          field="itemTitle"
          itemId={item.id}
          reportId={reportId}
          value={item.title}
          onCancel={() => setEditingKey(null)}
        />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-950">{item.title}</p>
          {readOnly ? null : <EditIconButton label={`Edit ${item.title} title`} onClick={() => setEditingKey(titleKey)} />}
        </div>
      )}

      {editingKey === bodyKey ? (
        <InlineReportEditForm
          action={action}
          field="itemBody"
          itemId={item.id}
          reportId={reportId}
          value={item.body}
          multiline
          onCancel={() => setEditingKey(null)}
        />
      ) : (
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="text-sm leading-6 text-zinc-600">{item.body}</p>
          {readOnly ? null : <EditIconButton label={`Edit ${item.title} body`} onClick={() => setEditingKey(bodyKey)} />}
        </div>
      )}
    </div>
  );
}

function InlineReportEditForm({
  action,
  field,
  itemId,
  multiline = false,
  onCancel,
  reportId,
  value,
}: {
  action: (formData: FormData) => void | Promise<void>;
  field: ReportNarrativeEditField;
  itemId?: string;
  multiline?: boolean;
  onCancel: () => void;
  reportId: string;
  value: string;
}) {
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="field" value={field} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}
      <label className="sr-only" htmlFor={`${field}-${itemId ?? reportId}`}>
        Report copy
      </label>
      {multiline ? (
        <textarea
          id={`${field}-${itemId ?? reportId}`}
          name="value"
          defaultValue={value}
          className="min-h-28 w-full rounded-md border border-zinc-950/10 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 outline-none transition focus:border-zinc-950/30 focus:ring-2 focus:ring-zinc-950/10"
        />
      ) : (
        <input
          id={`${field}-${itemId ?? reportId}`}
          name="value"
          defaultValue={value}
          className="h-10 w-full rounded-md border border-zinc-950/10 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-950/30 focus:ring-2 focus:ring-zinc-950/10"
        />
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <FormSubmitButton type="submit" size="sm" pendingLabel="Saving...">
          Save
        </FormSubmitButton>
      </div>
    </form>
  );
}

function EditableSectionHeader({
  editLabel,
  label,
  onEdit,
  readOnly = false,
}: {
  editLabel: string;
  label: string;
  onEdit: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      {readOnly ? null : <EditIconButton label={editLabel} onClick={onEdit} />}
    </div>
  );
}

function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
      onClick={onClick}
    >
      <Pencil size={14} aria-hidden="true" />
    </button>
  );
}

function DocumentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
