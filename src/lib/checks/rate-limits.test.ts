import { describe, expect, it, vi } from "vitest";
import {
  assertManualCheckRunRateLimit,
  consumeScheduledCheckRunRateLimit,
} from "./rate-limits";

describe("check execution rate limits", () => {
  it("applies both agency-wide and user-scoped limits for manual check execution", async () => {
    const single = vi.fn()
      .mockResolvedValueOnce({
        data: {
          allowed: true,
          limit_count: 100,
          remaining: 99,
          retry_after_seconds: 600,
          reset_at: "2026-06-18T10:10:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          allowed: true,
          limit_count: 20,
          remaining: 19,
          retry_after_seconds: 600,
          reset_at: "2026-06-18T10:10:00.000Z",
        },
        error: null,
      });
    const rpc = vi.fn(() => ({ single }));

    await expect(
      assertManualCheckRunRateLimit({
        agencyId: "agency-1",
        userId: "user-1",
        supabase: { rpc } as never,
      }),
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenNthCalledWith(1, "consume_rate_limit", expect.objectContaining({
      p_bucket_key: expect.stringMatching(/^manual-check-run-agency:/),
      p_limit: 100,
      p_window_seconds: 600,
    }));
    expect(rpc).toHaveBeenNthCalledWith(2, "consume_rate_limit", expect.objectContaining({
      p_bucket_key: expect.stringMatching(/^manual-check-run-user:/),
      p_limit: 20,
      p_window_seconds: 600,
    }));
  });

  it("uses an agency-wide bucket for scheduled check execution", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        allowed: false,
        limit_count: 300,
        remaining: 0,
        retry_after_seconds: 120,
        reset_at: "2026-06-18T10:10:00.000Z",
      },
      error: null,
    });
    const rpc = vi.fn(() => ({ single }));

    await expect(
      consumeScheduledCheckRunRateLimit({
        agencyId: "agency-1",
        supabase: { rpc } as never,
      }),
    ).resolves.toMatchObject({
      allowed: false,
      limit: 300,
      retryAfterSeconds: 120,
    });

    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", expect.objectContaining({
      p_bucket_key: expect.stringMatching(/^scheduled-check-run-agency:/),
      p_limit: 300,
      p_window_seconds: 600,
    }));
  });
});
