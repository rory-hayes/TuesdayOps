import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type GeneratedRunLogApiKey = {
  plaintext: string;
  prefix: string;
};

export function generateRunLogApiKey(randomSource: (size: number) => Buffer = randomBytes): GeneratedRunLogApiKey {
  const plaintext = `tops_${randomSource(24).toString("base64url")}`;

  return {
    plaintext,
    prefix: plaintext.slice(0, 16),
  };
}

export function hashRunLogApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyRunLogApiKey(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashRunLogApiKey(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function buildRunLogApiKeyRecord({
  agencyId,
  workflowId,
  key,
  name,
  expiresAt,
}: {
  agencyId: string;
  workflowId: string;
  key: GeneratedRunLogApiKey;
  name: string;
  expiresAt?: string | null;
}) {
  return {
    agency_id: agencyId,
    workflow_id: workflowId,
    name,
    key_prefix: key.prefix,
    key_hash: hashRunLogApiKey(key.plaintext),
    expires_at: expiresAt ?? null,
  };
}
