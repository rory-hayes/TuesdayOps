import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getWorkflowAuthEncryptionKey } from "@/lib/env";

export type EncryptedJsonPayload = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptJsonPayload(value: unknown): EncryptedJsonPayload {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(value);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptJsonPayload<T>(payload: EncryptedJsonPayload): T {
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as T;
}

function getEncryptionKey(): Buffer {
  const secret = getWorkflowAuthEncryptionKey();

  if (!secret) {
    throw new Error("WORKFLOW_AUTH_ENCRYPTION_KEY is required before storing workflow auth secrets.");
  }

  return createHash("sha256").update(secret).digest();
}
