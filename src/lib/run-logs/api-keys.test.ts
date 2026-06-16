import { describe, expect, it } from "vitest";
import {
  buildRunLogApiKeyRecord,
  generateRunLogApiKey,
  hashRunLogApiKey,
  verifyRunLogApiKey,
} from "./api-keys";

describe("run-log API keys", () => {
  it("generates a one-time key with a stable prefix and hash", () => {
    const key = generateRunLogApiKey(() => Buffer.alloc(24, 7));
    const record = buildRunLogApiKeyRecord({
      agencyId: "agency-1",
      workflowId: "workflow-1",
      key,
      name: "Primary logger",
    });

    expect(key.plaintext).toMatch(/^tops_/);
    expect(record).toMatchObject({
      agency_id: "agency-1",
      workflow_id: "workflow-1",
      name: "Primary logger",
      key_prefix: key.prefix,
    });
    expect(record.key_hash).toBe(hashRunLogApiKey(key.plaintext));
    expect(record.key_hash).not.toContain(key.plaintext);
  });

  it("verifies keys without accepting nearby values", () => {
    const key = generateRunLogApiKey(() => Buffer.alloc(24, 2));
    const hash = hashRunLogApiKey(key.plaintext);

    expect(verifyRunLogApiKey(key.plaintext, hash)).toBe(true);
    expect(verifyRunLogApiKey(`${key.plaintext}x`, hash)).toBe(false);
    expect(verifyRunLogApiKey("tops_wrong", hash)).toBe(false);
  });
});
