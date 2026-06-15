import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";
import { assertReportCanBeExported, buildReportQuality } from "@/lib/reports/quality";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ReportDownloadRouteProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function GET(_request: Request, { params }: ReportDownloadRouteProps) {
  const { workspace } = await getWorkspaceContext();

  if (!workspace) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { reportId } = await params;
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("reports")
    .select("id, pdf_storage_path")
    .eq("agency_id", workspace.agency.id)
    .eq("id", reportId)
    .single();

  if (error || !report?.pdf_storage_path) {
    return NextResponse.json({ error: "Report PDF could not be found." }, { status: 404 });
  }

  try {
    assertReportCanBeExported(buildReportQuality({
      data: await getOperationalData(workspace.agency),
      reportId,
    }));
  } catch (qualityError) {
    const message = qualityError instanceof Error
      ? qualityError.message
      : "Report is blocked until readiness issues are resolved.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data: file, error: downloadError } = await admin.storage
    .from("reports")
    .download(report.pdf_storage_path as string);

  if (downloadError || !file) {
    return NextResponse.json({ error: "Report PDF could not be downloaded." }, { status: 404 });
  }

  return new NextResponse(file, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="tuesdayops-report-${reportId}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
