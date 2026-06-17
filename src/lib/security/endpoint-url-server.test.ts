import { lookup } from "node:dns/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertResolvedWorkflowEndpointIsSafe,
  resolveSafeWorkflowEndpoint,
} from "@/lib/security/endpoint-url-server";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

const lookupMock = vi.mocked(lookup);

describe("assertResolvedWorkflowEndpointIsSafe", () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it("allows public hosts when DNS resolves to public addresses", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

    await expect(
      assertResolvedWorkflowEndpointIsSafe("https://API.example.com/v1/health?Signature=AbC%2F123"),
    ).resolves.toBe("https://API.example.com/v1/health?Signature=AbC%2F123");
    expect(lookupMock).toHaveBeenCalledWith("api.example.com", { all: true, verbatim: true });
  });

  it("returns the resolved public address for pinned outbound requests", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

    await expect(
      resolveSafeWorkflowEndpoint("https://api.example.com/v1/health"),
    ).resolves.toMatchObject({
      endpointUrl: "https://api.example.com/v1/health",
      resolvedAddress: "93.184.216.34",
      url: new URL("https://api.example.com/v1/health"),
    });
  });

  it("blocks public-looking hosts that resolve to private or metadata addresses", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }] as never);

    await expect(
      assertResolvedWorkflowEndpointIsSafe("https://metadata-proxy.example.com/check"),
    ).rejects.toThrow("Private or local workflow endpoints are blocked in production.");
  });

  it("blocks literal unsafe endpoints before DNS lookup", async () => {
    await expect(
      assertResolvedWorkflowEndpointIsSafe("http://127.0.0.1:3000/check"),
    ).rejects.toThrow("Private or local workflow endpoints are blocked in production.");
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when the host cannot be resolved", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));

    await expect(
      assertResolvedWorkflowEndpointIsSafe("https://missing.example.invalid/check"),
    ).rejects.toThrow("Workflow endpoint host could not be resolved.");
  });
});
