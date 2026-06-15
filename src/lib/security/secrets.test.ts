import { beforeEach, describe, expect, it, vi } from "vitest";

const getWorkflowAuthEncryptionKey = vi.fn();

vi.mock("@/lib/env", () => ({
  getWorkflowAuthEncryptionKey,
}));

const { decryptJsonPayload, encryptJsonPayload } = await import("@/lib/security/secrets");

describe("workflow auth secret encryption", () => {
  beforeEach(() => {
    getWorkflowAuthEncryptionKey.mockReturnValue("local-test-encryption-key");
  });

  it("round-trips JSON payloads without exposing plaintext in stored fields", () => {
    const encrypted = encryptJsonPayload({
      type: "bearer",
      token: "super-secret-token",
    });

    expect(encrypted).toMatchObject({
      v: 1,
      alg: "aes-256-gcm",
    });
    expect(JSON.stringify(encrypted)).not.toContain("super-secret-token");
    expect(decryptJsonPayload(encrypted)).toEqual({
      type: "bearer",
      token: "super-secret-token",
    });
  });

  it("requires a configured encryption key before writing auth config", () => {
    getWorkflowAuthEncryptionKey.mockReturnValue("");

    expect(() => encryptJsonPayload({ type: "none" })).toThrow(
      "WORKFLOW_AUTH_ENCRYPTION_KEY is required before storing workflow auth secrets.",
    );
  });

  it("rejects tampered payloads during decryption", () => {
    const encrypted = encryptJsonPayload({ type: "api_key_header", value: "secret" });

    expect(() =>
      decryptJsonPayload({
        ...encrypted,
        ciphertext: Buffer.from("tampered").toString("base64"),
      }),
    ).toThrow();
  });
});
