import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceContext } from "@/lib/auth/workspace";
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

describe("report PDF download route", () => {
  beforeEach(() => {
    vi.mocked(getWorkspaceContext).mockReset();
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
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
  return {
    from(table: string) {
      if (table !== "reports") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single: async () => reportResponse,
      };
    },
  } as never;
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
