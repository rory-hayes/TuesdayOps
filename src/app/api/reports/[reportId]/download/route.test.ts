import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getOperationalData } from "@/lib/data/operational-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/auth/workspace", () => ({
  getWorkspaceContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/data/operational-data", () => ({
  getOperationalData: vi.fn(),
}));

describe("report PDF download route", () => {
  beforeEach(() => {
    vi.mocked(getWorkspaceContext).mockReset();
    vi.mocked(getOperationalData).mockReset();
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(getOperationalData).mockResolvedValue(buildReportData({ checksRun: 3 }) as never);
  });

  it("requires an authenticated workspace", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({ user: null, workspace: null });

    const response = await GET(new Request("https://app.example.com/api/reports/report-1/download"), {
      params: Promise.resolve({ reportId: "report-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication is required." });
    expect(createClient).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 404 when the report row or storage path is unavailable", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      workspace: { agency: { id: "agency-1" } },
    } as never);
    vi.mocked(createClient).mockResolvedValue(
      createReportClient({ reportResponse: { data: { id: "report-1", pdf_storage_path: null }, error: null } }),
    );

    const response = await GET(new Request("https://app.example.com/api/reports/report-1/download"), {
      params: Promise.resolve({ reportId: "report-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Report PDF could not be found." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 404 for cross-tenant report ids before touching storage", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      workspace: { agency: { id: "agency-2" } },
    } as never);
    const reportClient = createReportClient({
      reportResponse: { data: null, error: { message: "No rows returned" } },
    });
    vi.mocked(createClient).mockResolvedValue(reportClient);

    const response = await GET(new Request("https://app.example.com/api/reports/report-1/download"), {
      params: Promise.resolve({ reportId: "report-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Report PDF could not be found." });
    expect((reportClient as unknown as { filters: Array<{ column: string; value: string }> }).filters)
      .toEqual([
        { column: "agency_id", value: "agency-2" },
        { column: "id", value: "report-1" },
      ]);
    expect(getOperationalData).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 404 when storage download fails", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      workspace: { agency: { id: "agency-1" } },
    } as never);
    vi.mocked(createClient).mockResolvedValue(createReportClient());
    vi.mocked(createAdminClient).mockReturnValue(
      createStorageClient({ fileResponse: { data: null, error: { message: "missing object" } } }),
    );

    const response = await GET(new Request("https://app.example.com/api/reports/report-1/download"), {
      params: Promise.resolve({ reportId: "report-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Report PDF could not be downloaded." });
  });

  it("blocks direct downloads when report readiness is blocked", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      workspace: { agency: { id: "agency-1" } },
    } as never);
    vi.mocked(getOperationalData).mockResolvedValue(buildReportData({ checksRun: 0 }) as never);
    vi.mocked(createClient).mockResolvedValue(createReportClient());

    const response = await GET(new Request("https://app.example.com/api/reports/report-1/download"), {
      params: Promise.resolve({ reportId: "report-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Report is blocked: Report has no check runs for this period.",
    });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("downloads report PDFs with no-store cache headers", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      workspace: { agency: { id: "agency-1" } },
    } as never);
    vi.mocked(createClient).mockResolvedValue(createReportClient());
    vi.mocked(createAdminClient).mockReturnValue(
      createStorageClient({ fileResponse: { data: new Blob(["%PDF-test"]), error: null } }),
    );

    const response = await GET(new Request("https://app.example.com/api/reports/report-1/download"), {
      params: Promise.resolve({ reportId: "report-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tuesdayops-report-report-1.pdf"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.text()).resolves.toBe("%PDF-test");
  });
});

function createReportClient({
  reportResponse = {
    data: { id: "report-1", pdf_storage_path: "agency-1/report-1.pdf" },
    error: null,
  },
}: {
  reportResponse?: {
    data: { id: string; pdf_storage_path: string | null } | null;
    error: { message: string } | null;
  };
} = {}) {
  const filters: Array<{ column: string; value: string }> = [];
  return {
    filters,
    from(table: string) {
      if (table !== "reports") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select() {
          return this;
        },
        eq(column: string, value: string) {
          filters.push({ column, value });
          return this;
        },
        single: async () => reportResponse,
      };
    },
  } as never;
}

function buildReportData({ checksRun }: { checksRun: number }) {
  return {
    reports: [
      {
        id: "report-1",
        clientId: "client-1",
        workflowsMonitored: 1,
        checksRun,
        recommendations: ["Keep monitoring cadence."],
      },
    ],
    reportItems: [
      {
        reportId: "report-1",
      },
    ],
    issues: [],
  };
}

function createStorageClient({
  fileResponse,
}: {
  fileResponse: { data: Blob | null; error: { message: string } | null };
}) {
  return {
    storage: {
      from(bucket: string) {
        if (bucket !== "reports") {
          throw new Error(`Unexpected bucket ${bucket}`);
        }

        return {
          download: vi.fn().mockResolvedValue(fileResponse),
        };
      },
    },
  } as never;
}
