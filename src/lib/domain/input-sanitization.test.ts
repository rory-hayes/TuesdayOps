import { describe, expect, it } from "vitest";
import { sanitizeUserText } from "./input-sanitization";

describe("sanitizeUserText", () => {
  it("removes script blocks and event-handler markup before storage", () => {
    expect(
      sanitizeUserText(
        `Lead intake <script>alert('XSS')</script><img src=x onerror=alert(1)> follow-up`,
      ),
    ).toBe("Lead intake [redacted] follow-up");
  });

  it("normalizes whitespace while preserving safe text content", () => {
    expect(sanitizeUserText("  Client   operations\n\nnotes  ")).toBe("Client operations notes");
  });

  it("removes javascript URLs and generic HTML tags", () => {
    expect(sanitizeUserText('<a href="javascript:alert(1)">Open</a> workflow')).toBe("Open workflow");
  });
});
