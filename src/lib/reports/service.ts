"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sendResendEmail } from "@/lib/alerts/resend";
import { recordAuditEvent } from "@/lib/audit/events";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getOperationalData, getReportSourceData } from "@/lib/data/operational-data";
import type { ReportDraft, ReportItemCategory } from "@/lib/domain/types";
import { getAppUrl } from "@/lib/env";
import { buildReportDraft } from "@/lib/reports/aggregation";
import { buildReportEmail, buildReportPdfAttachment, renderReportPdfBytes } from "@/lib/reports/pdf";
import { assertReportCanBeExported, buildReportQuality } from "@/lib/reports/quality";
import { sanitizeReportText } from "@/lib/reports/sanitize";
import { buildReportSendRedirect, formatReportSendError } from "@/lib/reports/send-feedback";
import { assertPersistentRateLimit } from "@/lib/security/rate-limit";
import { formatActionError } from "@/lib/server-actions/feedback";
import { assertMutationTouchedRow } from "@/lib/server-actions/mutation-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const generateReportFormSchema = z.object({
  clientId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

const reportIdFormSchema = z.object({
  reportId: z.string().uuid(),
});

const reportItemCategorySchema = z.enum([
  "workflow_health",
  "issues_caught",
  "issues_resolved",
  "qa_checks",
  "model_prompt_changes",
  "recommendation",
]);

const updateReportNarrativeFormSchema = z.object({
  reportId: z.string().uuid(),
  summary: z.string().trim().min(10).max(2000),
  recommendations: z.string().max(2000).optional().default(""),
  reportItemCategories: z.array(reportItemCategorySchema),
  reportItemSortOrders: z.array(z.coerce.number().int().min(0).max(1000)),
  reportItemTitles: z.array(z.string().trim().min(2).max(120)),
  reportItemBodies: z.array(z.string().trim().min(3).max(1200)),
});

type ReportRow = {
  id: string;
  agency_id: string;
  client_id: string;
  period: string;
  period_label: string;
  period_start: string;
  period_end: string;
  status: "draft" | "ready_to_send" | "sent" | "failed";
  summary: string;
  metrics_json: ReportDraft["metrics"];
  recommendations_json: string[];
  pdf_url: string | null;
  pdf_storage_path: string | null;
};

type ReportEditStatusRow = {
  id: string;
  status: "draft" | "ready_to_send" | "sent" | "failed";
};

type ReportItemRow = {
  category: ReportItemCategory;
  title: string;
  body: string;
  sort_order: number;
};

type ClientReportRow = {
  name: string;
  report_recipient_email: string | null;
};

export async function generateReportAction(formData: FormData) {
  const parsed = generateReportFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/reports?error=${encodeURIComponent("Report details did not pass validation.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const period = getReportPeriod(parsed.data.period);
  const data = await getReportSourceData({
    agency: workspace.agency,
    clientId: parsed.data.clientId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    supabaseOverride: supabase,
  });
  const draft = buildReportDraft({
    data,
    clientId: parsed.data.clientId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  });
  let reportId: string;

  try {
    reportId = await saveReportDraft({
      supabase,
      agencyId: workspace.agency.id,
      draft,
    });
    await recordReportAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "report.generated",
      reportId,
      metadata: {
        clientId: parsed.data.clientId,
        period: parsed.data.period,
      },
    });
  } catch (error) {
    redirect(`/reports?error=${encodeURIComponent(formatActionError(error, "Report could not be generated."))}`);
  }

  revalidatePath("/reports");
  redirect(`/reports/${reportId}?notice=${encodeURIComponent("Report generated.")}`);
}

export async function generateReportPdfAction(formData: FormData) {
  const parsed = reportIdFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/reports?error=${encodeURIComponent("Report id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const admin = createAdminClient();

  try {
    assertReportCanBeExported(buildReportQuality({
      data: await getOperationalData(workspace.agency),
      reportId: parsed.data.reportId,
    }));
    await generateAndStoreReportPdf({
      supabase,
      admin,
      agencyId: workspace.agency.id,
      reportId: parsed.data.reportId,
    });
    await recordReportAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "report.pdf_generated",
      reportId: parsed.data.reportId,
      metadata: {},
    });
  } catch (error) {
    redirect(
      `/reports?error=${encodeURIComponent(formatActionError(error, "Report PDF could not be generated."))}`,
    );
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${parsed.data.reportId}`);
  redirect(`/reports/${parsed.data.reportId}?notice=${encodeURIComponent("PDF is ready to download.")}`);
}

export async function sendReportAction(formData: FormData) {
  const parsed = reportIdFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/reports?error=${encodeURIComponent("Report id was invalid.")}`);
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const admin = createAdminClient();
  let sendStatus: "sent" | "failed" = "sent";
  let sendMessage: string | undefined;

  try {
    await assertPersistentRateLimit({
      scope: "report-send",
      identifier: `${workspace.agency.id}:${workspace.user.id}`,
      limit: 10,
      windowSeconds: 3600,
    });
    assertReportCanBeExported(buildReportQuality({
      data: await getOperationalData(workspace.agency),
      reportId: parsed.data.reportId,
    }));
    const { draft, pdfBytes } = await generateAndStoreReportPdf({
      supabase,
      admin,
      agencyId: workspace.agency.id,
      reportId: parsed.data.reportId,
    });
    const client = await loadClientForReportEmail({
      supabase,
      agencyId: workspace.agency.id,
      clientId: draft.clientId,
    });

    if (!client.report_recipient_email) {
      throw new Error("Client report recipient email is missing.");
    }

    const email = buildReportEmail({
      report: draft,
      downloadUrl: `${getAppUrl()}/api/reports/${parsed.data.reportId}/download`,
    });
    const delivery = await sendResendEmail({
      to: client.report_recipient_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: [
        buildReportPdfAttachment({
          report: draft,
          pdfBytes,
        }),
      ],
      idempotencyKey: `report:${parsed.data.reportId}`,
    });

    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        email_delivery_id: delivery.id,
        send_error: null,
      })
      .eq("agency_id", workspace.agency.id)
      .eq("id", parsed.data.reportId);

    if (updateError) {
      throw new Error(`Report send status could not be saved: ${updateError.message}`);
    }
    await recordReportAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "report.send_attempted",
      reportId: parsed.data.reportId,
      metadata: { status: "sent" },
    });
  } catch (error) {
    const safeMessage = formatReportSendError(error);
    sendStatus = "failed";
    sendMessage = safeMessage;
    await recordReportSendFailure({
      supabase,
      agencyId: workspace.agency.id,
      reportId: parsed.data.reportId,
      error: safeMessage,
    });
    await recordReportAuditEvent({
      agencyId: workspace.agency.id,
      actorUserId: workspace.user.id,
      action: "report.send_attempted",
      reportId: parsed.data.reportId,
      metadata: { status: "failed", error: safeMessage },
    });
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${parsed.data.reportId}`);
  redirect(buildReportSendRedirect({
    reportId: parsed.data.reportId,
    status: sendStatus,
    message: sendMessage,
  }));
}

export async function updateReportNarrativeAction(formData: FormData) {
  const parsed = parseUpdateReportNarrativeForm(formData);
  const rawReportId = formData.get("reportId");
  const fallbackReportId = typeof rawReportId === "string" ? rawReportId : undefined;

  if (!parsed.success) {
    redirect(buildReportNarrativeErrorRedirect(
      fallbackReportId,
      "Report narrative needs a summary, section copy, and client-safe recommendations.",
    ));
  }

  const workspace = await requireWorkspace();
  const supabase = await createClient();
  let narrative;

  try {
    const reportStatus = await loadReportEditStatus({
      supabase,
      agencyId: workspace.agency.id,
      reportId: parsed.data.reportId,
    });

    if (reportStatus.status === "sent") {
      throw new Error("Sent reports cannot be edited. Sent report history is preserved.");
    }

    narrative = buildReportNarrativeUpdate(parsed.data);
    const updateResult = await supabase
      .from("reports")
      .update({
        summary: narrative.summary,
        recommendations_json: narrative.recommendations,
        status: "draft",
        pdf_url: null,
        pdf_storage_path: null,
        email_delivery_id: null,
        sent_at: null,
        send_error: null,
      })
      .eq("agency_id", workspace.agency.id)
      .eq("id", parsed.data.reportId)
      .select("id")
      .maybeSingle();

    assertMutationTouchedRow(updateResult, "Report was not found or is not accessible.");

    const deleteResult = await supabase
      .from("report_items")
      .delete()
      .eq("agency_id", workspace.agency.id)
      .eq("report_id", parsed.data.reportId);

    if (deleteResult.error) {
      throw new Error(`Report sections could not be replaced: ${deleteResult.error.message}`);
    }

    if (narrative.items.length) {
      const { error: itemError } = await supabase.from("report_items").insert(
        narrative.items.map((item) => ({
          agency_id: workspace.agency.id,
          report_id: parsed.data.reportId,
          category: item.category,
          title: item.title,
          body: item.body,
          sort_order: item.sortOrder,
        })),
      );

      if (itemError) {
        throw new Error(`Report sections could not be saved: ${itemError.message}`);
      }
    }
  } catch (error) {
    redirect(buildReportNarrativeErrorRedirect(
      parsed.data.reportId,
      formatActionError(error, "Report narrative could not be saved."),
    ));
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${parsed.data.reportId}`);
  redirect(`/reports/${parsed.data.reportId}?notice=${encodeURIComponent("Report narrative saved.")}`);
}

export async function saveReportDraft({
  supabase,
  agencyId,
  draft,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  draft: ReportDraft;
}) {
  const { data: report, error } = await supabase
    .from("reports")
    .upsert(
      {
        agency_id: agencyId,
        client_id: draft.clientId,
        period_start: draft.periodStart,
        period_end: draft.periodEnd,
        period: draft.period,
        period_label: draft.periodLabel,
        status: "draft",
        summary: draft.summary,
        metrics_json: draft.metrics,
        recommendations_json: draft.recommendations,
        generated_at: new Date().toISOString(),
        pdf_url: null,
        pdf_storage_path: null,
        email_delivery_id: null,
        sent_at: null,
        send_error: null,
      },
      { onConflict: "agency_id,client_id,period_start,period_end" },
    )
    .select("id")
    .single();

  if (error || !report) {
    throw new Error(error?.message ?? "Report could not be saved.");
  }

  await supabase
    .from("report_items")
    .delete()
    .eq("agency_id", agencyId)
    .eq("report_id", report.id);

  const { error: itemError } = await supabase.from("report_items").insert(
    draft.items.map((item) => ({
      agency_id: agencyId,
      report_id: report.id,
      category: item.category,
      title: item.title,
      body: item.body,
      sort_order: item.sortOrder,
    })),
  );

  if (itemError) {
    throw new Error(`Report items could not be saved: ${itemError.message}`);
  }

  return report.id as string;
}

async function generateAndStoreReportPdf({
  supabase,
  admin,
  agencyId,
  reportId,
}: {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  agencyId: string;
  reportId: string;
}) {
  const draft = await loadReportDraftFromDatabase({ supabase, agencyId, reportId });
  const bytes = renderReportPdfBytes(draft);
  const storagePath = `${agencyId}/${reportId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("reports")
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Report PDF could not be stored: ${uploadError.message}`);
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      status: "ready_to_send",
      pdf_url: `/api/reports/${reportId}/download`,
      pdf_storage_path: storagePath,
      send_error: null,
    })
    .eq("agency_id", agencyId)
    .eq("id", reportId);

  if (updateError) {
    throw new Error(`Report PDF status could not be saved: ${updateError.message}`);
  }

  return { draft, pdfBytes: bytes };
}

async function loadReportDraftFromDatabase({
  supabase,
  agencyId,
  reportId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  reportId: string;
}): Promise<ReportDraft> {
  const { data: report, error } = await supabase
    .from("reports")
    .select("id, agency_id, client_id, period, period_label, period_start, period_end, status, summary, metrics_json, recommendations_json, pdf_url, pdf_storage_path")
    .eq("agency_id", agencyId)
    .eq("id", reportId)
    .single();

  if (error || !report) {
    throw new Error(error?.message ?? "Report could not be found.");
  }

  const reportRow = report as ReportRow;
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("name, report_recipient_email")
    .eq("agency_id", agencyId)
    .eq("id", reportRow.client_id)
    .single();

  if (clientError || !client) {
    throw new Error(clientError?.message ?? "Client could not be loaded for report.");
  }

  const { data: items, error: itemsError } = await supabase
    .from("report_items")
    .select("category, title, body, sort_order")
    .eq("agency_id", agencyId)
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(`Report items could not be loaded: ${itemsError.message}`);
  }

  return {
    clientId: reportRow.client_id,
    clientName: (client as ClientReportRow).name,
    period: reportRow.period,
    periodLabel: reportRow.period_label,
    periodStart: reportRow.period_start,
    periodEnd: reportRow.period_end,
    summary: reportRow.summary,
    metrics: reportRow.metrics_json,
    recommendations: Array.isArray(reportRow.recommendations_json)
      ? reportRow.recommendations_json
      : [],
    items: ((items ?? []) as ReportItemRow[]).map((item) => ({
      category: item.category,
      title: item.title,
      body: item.body,
      sortOrder: item.sort_order,
    })),
  };
}

async function loadReportEditStatus({
  supabase,
  agencyId,
  reportId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  reportId: string;
}): Promise<ReportEditStatusRow> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, status")
    .eq("agency_id", agencyId)
    .eq("id", reportId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Report was not found or is not accessible.");
  }

  return data as ReportEditStatusRow;
}

async function loadClientForReportEmail({
  supabase,
  agencyId,
  clientId,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  clientId: string;
}) {
  const { data, error } = await supabase
    .from("clients")
    .select("name, report_recipient_email")
    .eq("agency_id", agencyId)
    .eq("id", clientId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Client could not be loaded for report email.");
  }

  return data as ClientReportRow;
}

async function recordReportSendFailure({
  supabase,
  agencyId,
  reportId,
  error,
}: {
  supabase: SupabaseClient;
  agencyId: string;
  reportId: string;
  error: string;
}) {
  await supabase
    .from("reports")
    .update({
      status: "failed",
      send_error: sanitizeReportError(error),
    })
    .eq("agency_id", agencyId)
    .eq("id", reportId);
}

function getReportPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const periodStart = `${period}-01`;
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  return { periodStart, periodEnd };
}

function parseUpdateReportNarrativeForm(formData: FormData) {
  return updateReportNarrativeFormSchema.safeParse({
    reportId: formData.get("reportId"),
    summary: formData.get("summary"),
    recommendations: formData.get("recommendations") ?? "",
    reportItemCategories: formData.getAll("reportItemCategory").map(String),
    reportItemSortOrders: formData.getAll("reportItemSortOrder").map(String),
    reportItemTitles: formData.getAll("reportItemTitle").map(String),
    reportItemBodies: formData.getAll("reportItemBody").map(String),
  });
}

function buildReportNarrativeUpdate({
  summary,
  recommendations,
  reportItemCategories,
  reportItemSortOrders,
  reportItemTitles,
  reportItemBodies,
}: z.infer<typeof updateReportNarrativeFormSchema>) {
  const itemCount = reportItemTitles.length;

  if (
    reportItemCategories.length !== itemCount ||
    reportItemSortOrders.length !== itemCount ||
    reportItemBodies.length !== itemCount
  ) {
    throw new Error("Report sections could not be matched.");
  }

  return {
    summary: sanitizeRequiredReportText(summary, "Executive summary"),
    recommendations: recommendations
      .split(/\r?\n/)
      .map((item) => sanitizeReportText(item))
      .filter(Boolean)
      .slice(0, 5),
    items: reportItemTitles.map((title, index) => ({
      category: reportItemCategories[index] as ReportItemCategory,
      title: sanitizeRequiredReportText(title, "Report section title"),
      body: sanitizeRequiredReportText(reportItemBodies[index], "Report section body"),
      sortOrder: reportItemSortOrders[index],
    })),
  };
}

function sanitizeRequiredReportText(value: string, label: string) {
  const sanitized = sanitizeReportText(value);

  if (!sanitized) {
    throw new Error(`${label} needs client-safe copy.`);
  }

  return sanitized;
}

function buildReportNarrativeErrorRedirect(reportId: string | undefined, message: string) {
  const target = reportId && z.string().uuid().safeParse(reportId).success
    ? `/reports/${reportId}`
    : "/reports";

  return `${target}?error=${encodeURIComponent(message)}`;
}

function sanitizeReportError(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]")
    .slice(0, 600);
}

async function recordReportAuditEvent({
  agencyId,
  actorUserId,
  action,
  reportId,
  metadata,
}: {
  agencyId: string;
  actorUserId: string;
  action: "report.generated" | "report.pdf_generated" | "report.send_attempted";
  reportId: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await recordAuditEvent({
      supabase: createAdminClient(),
      agencyId,
      actorUserId,
      action,
      targetType: "report",
      targetId: reportId,
      metadata,
    });
  } catch {
    // Audit logging must not block report generation or delivery attempts.
  }
}
